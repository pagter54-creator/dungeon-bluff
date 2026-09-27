import crypto from 'node:crypto';
import {PVE_CHARACTER_DEFS,isCardSelectableForCharacter} from '../supabase/functions/game-api/pve/characters.js';
import {AUGMENT_DEFINITIONS} from '../supabase/functions/game-api/pve/augment-catalog.js';
import {newPlayerRunState,newCombatState} from '../supabase/functions/game-api/pve/model.js';
import {beginTurn,submitCard,resolveBasicTurn} from '../supabase/functions/game-api/pve/combat.js';
import {projectRun} from '../supabase/functions/game-api/pve/projection.js';
import {F1_MONSTER_DEFINITIONS,F1_RELIC_DEFINITIONS} from '../supabase/functions/game-api/pve/content-f1.js';
import {installRelicCatalog} from '../supabase/functions/game-api/pve/relics.js';

export const STRESS_SCHEMA_VERSION=1;
export const HARD_MAX_TURNS=100;
export const HARD_MAX_ACTIONS=5000;

export class StressHardFailure extends Error{
  constructor(code,message,details={}){
    super(message);this.name='StressHardFailure';this.code=code;this.details=details;
  }
}
const fail=(code,message,details={})=>{throw new StressHardFailure(code,message,details);};
const finite=(v)=>typeof v==='number'&&Number.isFinite(v);
const hash=(value)=>crypto.createHash('sha256').update(typeof value==='string'?value:stableStringify(value)).digest('hex');
const seededIndex=(seed,key,length)=>{
  if(!Number.isInteger(length)||length<=0)fail('BOT_NO_LEGAL_ACTION','seededIndex received no choices',{seed,key,length});
  const n=Number.parseInt(hash(`${seed}|${key}`).slice(0,12),16);
  return n%length;
};
export function stableStringify(value){
  if(value===null||typeof value!=='object')return JSON.stringify(value);
  if(Array.isArray(value))return `[${value.map(stableStringify).join(',')}]`;
  return `{${Object.keys(value).sort().map(k=>`${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`;
}
function semantic(value){
  if(Array.isArray(value))return value.map(semantic);
  if(!value||typeof value!=='object')return value;
  const out={};
  for(const [k,v] of Object.entries(value)){
    if(['submittedAt','createdAt','updatedAt','voteDeadline','reservedUntil'].includes(k))continue;
    out[k]=semantic(v);
  }
  return out;
}
export function semanticFingerprint(value){return hash(semantic(value));}

const EXECUTABLE_BUILD_NAMES=new Set(
  AUGMENT_DEFINITIONS.filter(x=>Array.isArray(x.effects)&&x.effects.length>0).map(x=>`${x.characterId}:${x.build}`)
);
export const STRESS_SCENARIOS=Object.freeze([
  {
    id:'T00',name:'Reference',runner:'floor',policy:'reference',
    characters:['adventurer','warrior','mage','rogue'],
    builds:[['adventurer','노련한 탐험가'],['warrior','불굴의 기사'],['mage','대마도 증폭'],['rogue','비열한 일격']]
  },
  {
    id:'T05',name:'Number Mutation',runner:'combat',policy:'reference',
    characters:['mage','vampire','imp','warrior'],
    builds:[['mage','역산술'],['vampire','완전한 권속'],['imp','대담한 슬쩍'],['warrior','불굴의 기사']]
  },
  {
    id:'T09',name:'Resource Starvation',runner:'combat',policy:'resource_starvation',
    characters:['warrior','mage','prophet','gunner'],builds:[]
  },
  {id:'T14',name:'Flame Boundary',runner:'synthetic',policy:'fixture',characters:[],builds:[]},
  {
    id:'T02',name:'Burst Ceiling',runner:'boss',policy:'burst',
    characters:['gunner','demon_swordsman','martial_artist','berserker'],
    builds:[['gunner','전탄 난사'],['demon_swordsman','해방된 귀검'],['martial_artist','일격필살'],['berserker','피의 광전']]
  },
  {
    id:'T03',name:'Sustain Fortress',runner:'floor',policy:'sustain',
    characters:['warrior','vampire','berserker','mage'],
    builds:[['warrior','수호벽'],['vampire','수혈'],['berserker','불사 투사'],['mage','백마도사']]
  },
  {
    id:'T04',name:'Collision Farm',runner:'combat',policy:'collision_farm',
    characters:['warrior','imp','berserker','vampire'],
    builds:[['warrior','압살 기사'],['imp','대담한 슬쩍'],['berserker','불사 투사'],['vampire','완전한 권속']]
  },
  {
    id:'T06',name:'Recovery Loop',runner:'combat',policy:'recovery',
    characters:['prophet','gunner','twins','demon_swordsman'],
    builds:[['prophet','운명 조작자'],['gunner','전탄 난사'],['twins','공중 곡예'],['demon_swordsman','포식 귀참']]
  }
]);

export function scenarioAvailability(def){
  const missingCharacters=(def.characters||[]).filter(id=>!Object.hasOwn(PVE_CHARACTER_DEFS,id));
  const missingBuildEffects=(def.builds||[]).filter(([characterId,build])=>!EXECUTABLE_BUILD_NAMES.has(`${characterId}:${build}`))
    .map(([characterId,build])=>({characterId,build}));
  const reasons=[];
  if(missingCharacters.length)reasons.push(`PVE character engine not implemented: ${missingCharacters.join(', ')}`);
  if(missingBuildEffects.length)reasons.push(`build effects are not executable (metadata-only or absent): ${missingBuildEffects.map(x=>`${x.characterId}/${x.build}`).join(', ')}`);
  return {available:reasons.length===0,reasons,missingCharacters,missingBuildEffects};
}

export const SPEC_AMBIGUITIES=Object.freeze([
  {
    id:'AMB-T14-05',
    scenarioId:'T14',
    topic:'Boss kill and full-party wipe in the same resolve',
    detail:'The stress spec requires a fixture but does not state precedence explicitly. Current rule engine resolves DOWN/RUN_FAILED at KILL_CHECK before boss-clear revival, so RUN_FAILED wins when Flame is 0 and everyone is DOWNED.'
  },
  {
    id:'AMB-T14-06',
    scenarioId:'T14',
    topic:'Healing and lethal damage in the same resolve',
    detail:'The stress spec names the case without an explicit precedence rule. Current engine fires PLAYER_DAMAGED effects before DOWN_RESOLVE, so an immediate heal can prevent DOWN.'
  },
  {
    id:'AMB-BUILD-EXEC',
    scenarioId:'MULTI',
    topic:'Augment build metadata vs executable build effects',
    detail:'The augment catalog currently provides selection metadata but no executable effects field. Scenarios that require named builds are SKIP even when the base character exists.'
  },
  {
    id:'AMB-T14-TERM',
    scenarioId:'T14',
    topic:'stun/down/death terminology',
    detail:'Stress T14 uses 기절/사망 wording while the server distinguishes STUNNED_NEXT_TURN (Flame rescue) from DOWNED (Flame 0). Fixtures use server states and core PVE ordering.'
  }
]);

function makeMembers(characterIds){
  return characterIds.map((character_id,i)=>({
    id:`p${i}`,user_id:`stress-user-${i}`,member_type:'human',character_id,seat_index:i
  }));
}
function makeCombatRun(seed,{caseId='combat',characterIds=['adventurer','adventurer','adventurer','adventurer'],flame=4,monsterDef=F1_MONSTER_DEFINITIONS.f1_armored_boar}={}){
  const players=makeMembers(characterIds).map(newPlayerRunState);
  const run={
    id:`stress-run:${seed}:${caseId}`,roomId:'stress-room',seed,rngCounter:0,version:0,
    phase:'COMBAT',floor:1,depth:1,flame,maxFlame:5,currentRoomNodeId:`stress-node:${caseId}`,
    players,usedMonsterIds:[],chosenBossIds:{1:'f1_fallen_lord'},map:{nodes:[],edges:{}},
    createdAt:'stress',updatedAt:'stress'
  };
  installRelicCatalog(run,F1_RELIC_DEFINITIONS);
  const roomType=monsterDef.tier==='BOSS'?'BOSS':monsterDef.tier==='ELITE'?'ELITE_COMBAT':'NORMAL_COMBAT';
  run.combat=newCombatState(players,monsterDef.baseHp,roomType,monsterDef);
  run.combat.id=`stress-combat:${seed}:${caseId}`;
  beginTurn(run);
  return run;
}
function cardFromView(view,playerId,baseNumber){
  const player=view.players.find(p=>p.playerId===playerId);
  const ids=view.privateCombat?.remainingCardIds||[];
  const card=player?.cardPool?.find(c=>c.baseNumber===baseNumber&&ids.includes(c.id));
  return card||null;
}
function legalCardsFromView(view,playerId){
  const player=view.players.find(p=>p.playerId===playerId);
  const ids=view.privateCombat?.remainingCardIds||[];
  return (player?.cardPool||[]).filter(c=>ids.includes(c.id)&&isCardSelectableForCharacter(player,c));
}
function submitNumbers(run,numbers){
  let actions=0;
  for(let i=0;i<numbers.length;i++){
    const pid=`p${i}`,view=projectRun(run,pid);
    assertNoHiddenInfo(view,pid);
    const card=cardFromView(view,pid,numbers[i]);
    if(!card)fail('BOT_NO_LEGAL_ACTION',`fixture card ${numbers[i]} unavailable`,{playerId:pid,numbers});
    submitCard(run,pid,card.id,false);actions++;
    assertRunInvariants(run);
  }
  const result=resolveBasicTurn(run);actions++;
  if(!result)fail('SOFTLOCK','fixture did not resolve after all submissions');
  assertRunInvariants(run);
  return {result,actions};
}
function attachEffect(run,playerIds,ownerId,effect){
  run.effectCatalog[ownerId]={effects:[structuredClone(effect)]};
  for(const pid of playerIds){
    const p=run.players.find(x=>x.playerId===pid);
    if(!p.relics.includes(ownerId))p.relics.push(ownerId);
  }
}
function caseSnapshot(id,run,extra={}){
  return {
    id,phase:run.phase,flame:run.flame,
    hp:run.players.map(p=>p.hp),
    statuses:run.players.map(p=>p.status),
    monsterHp:run.combat?.monster?.hp??null,
    turn:run.combat?.turn??null,
    rngCounter:run.rngCounter,
    ...extra
  };
}

export function runT14(seed){
  const cases=[];let actionCount=0;

  {
    const run=makeCombatRun(seed,{caseId:'T14-1',flame:1});
    run.players[0].hp=1;
    run.combat.monster.intent={type:'DIRECT_DAMAGE',telegraphText:'fixture',payload:{targetPlayerId:'p0',amount:1}};
    const x=submitNumbers(run,[1,2,3,4]);actionCount+=x.actions;
    const snap=caseSnapshot('T14-1',run);
    if(snap.phase!=='COMBAT'||snap.flame!==0||snap.hp[0]!==1||snap.statuses[0]!=='STUNNED_NEXT_TURN')fail('T14_FLAME_ONE_SINGLE_DOWN','Flame 1 single-down fixture diverged',{snap});
    cases.push(snap);
  }
  {
    const run=makeCombatRun(seed,{caseId:'T14-2',flame:1});
    run.players[0].hp=1;run.players[1].hp=1;
    run.combat.monster.intent={type:'AOE_DAMAGE',telegraphText:'fixture',payload:{amount:1}};
    const x=submitNumbers(run,[1,2,3,4]);actionCount+=x.actions;
    const snap=caseSnapshot('T14-2',run);
    if(snap.phase!=='COMBAT'||snap.flame!==0||snap.hp[0]!==1||snap.statuses[0]!=='STUNNED_NEXT_TURN'||snap.hp[1]!==0||snap.statuses[1]!=='DOWNED')fail('T14_FLAME_ONE_DOUBLE_DOWN','seat-priority Flame allocation diverged',{snap});
    cases.push(snap);
  }
  {
    const run=makeCombatRun(seed,{caseId:'T14-3',flame:0});
    for(let i=1;i<4;i++){run.players[i].hp=0;run.players[i].status='DOWNED';}
    assertRunInvariants(run);
    const snap=caseSnapshot('T14-3',run);
    if(snap.phase!=='COMBAT'||snap.statuses[0]!=='ACTIVE'||snap.statuses.slice(1).some(x=>x!=='DOWNED'))fail('T14_FLAME_ZERO_ONE_SURVIVOR','Flame 0 with one survivor should remain in combat',{snap});
    cases.push(snap);
  }
  {
    const run=makeCombatRun(seed,{caseId:'T14-4',flame:0});
    for(const p of run.players)p.hp=1;
    run.combat.monster.intent={type:'AOE_DAMAGE',telegraphText:'fixture',payload:{amount:1}};
    const x=submitNumbers(run,[1,2,3,4]);actionCount+=x.actions;
    const snap=caseSnapshot('T14-4',run);
    if(snap.phase!=='RUN_FAILED'||snap.statuses.some(x=>x!=='DOWNED'))fail('T14_FLAME_ZERO_FULL_WIPE','Flame 0 full wipe did not fail the run',{snap});
    cases.push(snap);
  }
  {
    const run=makeCombatRun(seed,{caseId:'T14-5',flame:0,monsterDef:F1_MONSTER_DEFINITIONS.f1_fallen_lord});
    for(const p of run.players)p.hp=1;
    run.combat.monster.hp=1;
    attachEffect(run,run.players.map(p=>p.playerId),'stress-self-lethal',{
      id:'stress-self-lethal-effect',trigger:'BEFORE_DAMAGE',priority:1,maxTriggers:1,resetScope:'TURN',
      operations:[{type:'DAMAGE_SELF',amount:1}]
    });
    const x=submitNumbers(run,[1,2,3,4]);actionCount+=x.actions;
    const snap=caseSnapshot('T14-5',run,{precedence:'RUN_FAILED_BEFORE_BOSS_CLEAR'});
    if(snap.monsterHp!==0||snap.phase!=='RUN_FAILED'||snap.statuses.some(x=>x!=='DOWNED'))fail('T14_BOSS_KILL_WIPE_ORDER','Boss-kill/full-wipe precedence changed',{snap});
    cases.push(snap);
  }
  {
    const run=makeCombatRun(seed,{caseId:'T14-6',flame:1});
    run.players[0].hp=1;
    attachEffect(run,['p0'],'stress-lethal-heal',{
      id:'stress-lethal-heal-effect',trigger:'PLAYER_DAMAGED',priority:1,maxTriggers:1,resetScope:'TURN',
      operations:[{type:'HEAL',amount:1}]
    });
    run.combat.monster.intent={type:'DIRECT_DAMAGE',telegraphText:'fixture',payload:{targetPlayerId:'p0',amount:1}};
    const x=submitNumbers(run,[1,2,3,4]);actionCount+=x.actions;
    const snap=caseSnapshot('T14-6',run,{precedence:'PLAYER_DAMAGED_HEAL_BEFORE_DOWN_RESOLVE'});
    if(snap.phase!=='COMBAT'||snap.flame!==1||snap.hp[0]!==1||snap.statuses[0]!=='ACTIVE')fail('T14_HEAL_LETHAL_ORDER','Heal/lethal precedence changed',{snap});
    cases.push(snap);
  }

  const result={scenarioId:'T14',seed,status:'PASS',actionCount,cases};
  result.replayFingerprint=semanticFingerprint(result);
  return result;
}

export function assertNoHiddenInfo(view,viewerPlayerId){
  if(view.combat?.privateByPlayer||view.roomState?.privateByPlayer)fail('HIDDEN_INFORMATION_LEAK','privateByPlayer leaked into PlayerView',{viewerPlayerId});
  for(const p of view.players||[]){
    if(p.playerId===viewerPlayerId)continue;
    if((p.cardPool||[]).some(card=>Object.hasOwn(card,'id')))fail('HIDDEN_INFORMATION_LEAK','opponent physical card id leaked through cardPool',{viewerPlayerId,opponent:p.playerId});
  }
  if(view.privateCombat&&view.privateCombat.playerId!==viewerPlayerId)fail('HIDDEN_INFORMATION_LEAK','foreign privateCombat projected',{viewerPlayerId,owner:view.privateCombat.playerId});
  if(view.privateRoomState&&view.privateRoomState.playerId!==viewerPlayerId)fail('HIDDEN_INFORMATION_LEAK','foreign privateRoomState projected',{viewerPlayerId,owner:view.privateRoomState.playerId});
  return true;
}
function validateZone(player,state,kind){
  if(!state)return;
  const poolIds=player.cardPool.map(c=>c.id),poolSet=new Set(poolIds);
  if(poolSet.size!==poolIds.length)fail('CARD_DUPLICATION','duplicate physical card instance in cardPool',{playerId:player.playerId,kind});
  const remaining=state.remainingCardIds||[],spent=state.spentCardIds||[];
  if(new Set(remaining).size!==remaining.length||new Set(spent).size!==spent.length)fail('CARD_DUPLICATION','duplicate card instance inside a zone',{playerId:player.playerId,kind});
  const overlap=remaining.filter(id=>spent.includes(id));
  if(overlap.length)fail('CARD_DUPLICATION','physical card instance exists in remaining and spent zones',{playerId:player.playerId,kind,overlap});
  for(const id of [...remaining,...spent])if(!poolSet.has(id))fail('CARD_STATE_MISMATCH','zone references a missing physical card',{playerId:player.playerId,kind,id});
  if(state.selectedCardId&&!remaining.includes(state.selectedCardId))fail('CARD_STATE_MISMATCH','selected card is not in remaining zone',{playerId:player.playerId,kind,selectedCardId:state.selectedCardId});
}
export function assertRunInvariants(run){
  if(!finite(run.flame)||!finite(run.maxFlame)||run.flame<0||run.flame>run.maxFlame)fail('INVALID_RESOURCE','Flame outside allowed range',{flame:run.flame,maxFlame:run.maxFlame});
  if((run.combat?.turn||0)>HARD_MAX_TURNS)fail('INFINITE_LOOP','combat exceeded hard turn ceiling',{turn:run.combat.turn});
  for(const p of run.players||[]){
    if(!finite(p.hp)||p.hp<0||p.hp>p.maxHp)fail('INVALID_HP','HP outside allowed range',{playerId:p.playerId,hp:p.hp,maxHp:p.maxHp});
    if(!finite(p.runGold)||p.runGold<0||!finite(p.growthExp)||p.growthExp<0)fail('NEGATIVE_RESOURCE','negative/invalid persistent resource',{playerId:p.playerId,runGold:p.runGold,growthExp:p.growthExp});
    for(const [name,value] of Object.entries(p.publicResources||{}))if(typeof value==='number'&&(!finite(value)||value<0))fail('NEGATIVE_RESOURCE','negative/invalid combat resource',{playerId:p.playerId,name,value});
    for(const [number,value] of Object.entries(p.engravings||{}))if(!finite(value)||value<0)fail('NEGATIVE_RESOURCE','negative/invalid engraving',{playerId:p.playerId,number,value});
    validateZone(p,run.combat?.privateByPlayer?.[p.playerId],'combat');
    validateZone(p,run.roomState?.privateByPlayer?.[p.playerId],'room');
  }
  for(const p of run.players||[])assertNoHiddenInfo(projectRun(run,p.playerId),p.playerId);
  return true;
}

export function deterministicBotDecision(run,playerId,{policy='reference',seed=run.seed}={}){
  const view=projectRun(run,playerId);
  assertNoHiddenInfo(view,playerId);
  const player=view.players.find(p=>p.playerId===playerId);
  if(!player||player.status==='DOWNED')return null;
  const cards=legalCardsFromView(view,playerId);
  if(!cards.length)return null;
  let ordered=[...cards];
  if(policy==='resource_starvation')ordered.sort((a,b)=>a.baseNumber-b.baseNumber||a.id.localeCompare(b.id));
  else if(policy==='collision_farm')ordered.sort((a,b)=>a.baseNumber-b.baseNumber||a.id.localeCompare(b.id));
  else ordered.sort((a,b)=>b.baseNumber-a.baseNumber||a.id.localeCompare(b.id));
  const top=ordered.filter(c=>c.baseNumber===ordered[0].baseNumber);
  const card=top[seededIndex(seed,`${policy}:${run.currentRoomNodeId}:${run.combat?.turn}:${playerId}`,top.length)];
  let skillIntent=false;
  if(policy!=='resource_starvation'){
    if(player.characterId==='gunner'&&player.publicResources.fullBurstReady)skillIntent=true;
    if(player.characterId==='mage'&&(player.publicResources.mana||0)>=2)skillIntent=true;
    if(player.characterId==='warrior'&&(player.publicResources.toughnessCharges||0)>0&&card.baseNumber>=5)skillIntent=true;
  }else{
    if(player.characterId==='mage'&&(player.publicResources.mana||0)>=2)skillIntent=true;
    if(player.characterId==='warrior'&&(player.publicResources.toughnessCharges||0)>0)skillIntent=true;
    if(player.characterId==='gunner'&&player.publicResources.fullBurstReady)skillIntent=true;
  }
  return {cardInstanceId:card.id,skillIntent};
}

export function simulateCombat({seed,characterIds,monsterDef=F1_MONSTER_DEFINITIONS.f1_armored_boar,policy='reference',flame=4,maxTurns=HARD_MAX_TURNS}){
  const run=makeCombatRun(seed,{caseId:'generic-combat',characterIds,flame,monsterDef});
  let actions=0,resolves=0;
  while(run.phase==='COMBAT'){
    if(run.combat.turn>maxTurns)fail('INFINITE_LOOP','simulation exceeded turn ceiling',{seed,turn:run.combat.turn});
    const turn=run.combat.turn;
    for(const p of run.players){
      if(p.status==='DOWNED'||run.combat.turnSubmissions[p.playerId])continue;
      const decision=deterministicBotDecision(run,p.playerId,{policy,seed});
      if(!decision)fail('SOFTLOCK','active player has no legal bot action',{seed,playerId:p.playerId,turn});
      submitCard(run,p.playerId,decision.cardInstanceId,decision.skillIntent);actions++;
      assertRunInvariants(run);
    }
    const result=resolveBasicTurn(run);actions++;resolves++;
    if(!result)fail('SOFTLOCK','resolve returned null with all bot actions submitted',{seed,turn});
    if(resolves>maxTurns)fail('INFINITE_LOOP','resolve count exceeded maximum',{seed,resolves});
    assertRunInvariants(run);
    if(run.phase==='COMBAT'&&run.combat.turn===turn)fail('SOFTLOCK','combat turn did not advance after resolve',{seed,turn});
    if(actions>HARD_MAX_ACTIONS)fail('INFINITE_LOOP','simulation action ceiling exceeded',{seed,actions});
  }
  return {seed,outcome:run.phase,actions,resolves,finalFlame:run.flame,players:run.players.map(p=>({playerId:p.playerId,hp:p.hp,status:p.status,runGold:p.runGold,growthExp:p.growthExp})),combat:semantic(run.combat)};
}

export function runScenario(scenarioId,seed){
  const def=STRESS_SCENARIOS.find(x=>x.id===scenarioId);
  if(!def)fail('UNKNOWN_SCENARIO',`unknown stress scenario ${scenarioId}`);
  const availability=scenarioAvailability(def);
  if(!availability.available)return {scenarioId,seed,status:'SKIP',skipReasons:availability.reasons};
  if(scenarioId==='T14')return runT14(seed);
  fail('SCENARIO_RUNNER_NOT_IMPLEMENTED',`${scenarioId} became available but its runner is not implemented yet`,{scenarioId});
}

export function replayScenario(scenarioId,seed){
  const first=runScenario(scenarioId,seed),second=runScenario(scenarioId,seed);
  const a=semantic(first),b=semantic(second);
  if(stableStringify(a)!==stableStringify(b))fail('NON_DETERMINISTIC_REPLAY','same seed + same inputs produced different semantic results',{scenarioId,seed,first:a,second:b});
  return {...first,replayVerified:true,replayFingerprint:semanticFingerprint(a)};
}

export function balanceWarnings(result){
  if(result.status!=='PASS')return [];
  const warnings=[];
  const combats=result.combats||[];
  const targets={NORMAL_COMBAT:6,ELITE_COMBAT:10,BOSS:14};
  for(const [room,target] of Object.entries(targets)){
    const rows=combats.filter(x=>x.roomType===room);
    if(!rows.length)continue;
    const avg=rows.reduce((s,x)=>s+x.turns,0)/rows.length;
    if(avg<target*.65||avg>target*1.35)warnings.push({code:'TURN_LENGTH_OUTSIDE_35_PERCENT',roomType:room,target,average:avg});
  }
  return warnings;
}

export function skippedScenarioReport(){
  return STRESS_SCENARIOS.map(def=>({def,availability:scenarioAvailability(def)}))
    .filter(x=>!x.availability.available)
    .map(({def,availability})=>({scenarioId:def.id,name:def.name,reasons:availability.reasons,missingCharacters:availability.missingCharacters,missingBuildEffects:availability.missingBuildEffects}));
}

export function t14GoldenComparable(result){
  return {
    scenarioId:result.scenarioId,status:result.status,
    cases:result.cases.map(x=>({id:x.id,phase:x.phase,flame:x.flame,hp:x.hp,statuses:x.statuses,monsterHp:x.monsterHp,...(x.precedence?{precedence:x.precedence}: {})}))
  };
}
