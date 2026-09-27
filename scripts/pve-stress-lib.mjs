import crypto from 'node:crypto';
import {PVE_CHARACTER_DEFS,isCardSelectableForCharacter} from '../supabase/functions/game-api/pve/characters.js';
import {AUGMENT_DEFINITIONS,AUGMENT_BY_ID} from '../supabase/functions/game-api/pve/augment-catalog.js';
import {PVE_RESOURCE_DEFS,resourceMax} from '../supabase/functions/game-api/pve/resources.js';
import {newPlayerRunState,newCombatState} from '../supabase/functions/game-api/pve/model.js';
import {beginTurn,submitCard,resolveBasicTurn} from '../supabase/functions/game-api/pve/combat.js';
import {projectRun} from '../supabase/functions/game-api/pve/projection.js';
import {F1_MONSTER_DEFINITIONS,F1_RELIC_DEFINITIONS} from '../supabase/functions/game-api/pve/content-f1.js';
import {installRelicCatalog} from '../supabase/functions/game-api/pve/relics.js';
import {buildReferenceIntent,negotiateReferenceIntents,summarizeReferenceTurns} from './pve-reference-policy.mjs';
import {buildNumberMutationIntent,planNumberMutationTurn} from './pve-number-mutation-policy.mjs';

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
  AUGMENT_DEFINITIONS.filter(x=>x.executable===true).map(x=>`${x.characterId}:${x.build}`)
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

export const CANONICAL_RULES=Object.freeze([
  {id:'RULE-01',topic:'Boss kill + full wipe',rule:'Flame 0에서 같은 resolve에 보스 처치와 파티 전원 DOWNED가 동시에 확정되면 RUN_FAILED가 boss clear보다 우선한다.'},
  {id:'RULE-02',topic:'Heal + lethal same resolve',rule:'lethal은 pending 상태로 두고 즉시 회복/보호/구조를 먼저 처리한 뒤 DOWN_RESOLVE에서 HP<=0인 플레이어만 DOWNED로 확정한다.'},
  {id:'RULE-03',topic:'Executable augments',rule:'390장 metadata는 유지하되 실제 effects가 있는 증강만 executable로 취급한다. 이번 범위에서 T00의 4개 1차 증강만 executable이다.'},
  {id:'RULE-04',topic:'DOWNED vs STUNNED_NEXT_TURN',rule:'DOWNED=쓰러짐/행동 불가, STUNNED_NEXT_TURN=기절/생존/다음 턴 자동 제출 대상으로 서로 다른 상태다.'},
  {id:'RULE-05',topic:'Combat-only resource lifecycle',rule:'COMBAT_END에서 resetScope=COMBAT 자원을 clear하고 COMBAT_START에서도 방어적으로 initialize한다. run-persistent 자원은 유지한다.'}
]);

export const SPEC_AMBIGUITIES=Object.freeze([]);

function makeMembers(characterIds){
  return characterIds.map((character_id,i)=>({
    id:`p${i}`,user_id:`stress-user-${i}`,member_type:'human',character_id,seat_index:i
  }));
}
function makeCombatRun(seed,{caseId='combat',characterIds=['adventurer','adventurer','adventurer','adventurer'],augmentIdsByPlayer=[],flame=4,monsterDef=F1_MONSTER_DEFINITIONS.f1_armored_boar}={}){
  const players=makeMembers(characterIds).map(newPlayerRunState);
  for(let i=0;i<players.length;i++){
    const ids=[...(augmentIdsByPlayer[i]||[])];
    players[i].augments=ids;
    const first=ids.map(id=>AUGMENT_BY_ID[id]).find(Boolean);
    if(first)players[i].augmentBuild=first.build;
  }
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
    run.combat.monster.intent={type:'CHARGE',telegraphText:'fixture',payload:{}};
    const view=projectRun(run,'p0');assertNoHiddenInfo(view,'p0');
    const card=cardFromView(view,'p0',1);
    if(!card)fail('BOT_NO_LEGAL_ACTION','T14-3 survivor has no legal card');
    submitCard(run,'p0',card.id,false);actionCount++;
    const result=resolveBasicTurn(run);actionCount++;
    if(!result)fail('SOFTLOCK','T14-3 survivor could not advance the turn');
    assertRunInvariants(run);
    const snap=caseSnapshot('T14-3',run);
    if(snap.phase!=='COMBAT'||snap.statuses[0]!=='ACTIVE'||snap.statuses.slice(1).some(x=>x!=='DOWNED')||snap.turn!==2)fail('T14_FLAME_ZERO_ONE_SURVIVOR','Flame 0 with one survivor did not advance normally',{snap});
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
  if(view.combat?.turnSubmissions||view.roomState?.turnSubmissions)fail('HIDDEN_INFORMATION_LEAK','raw turn submissions leaked into PlayerView',{viewerPlayerId});
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
    if(Number(p.publicResources?.mana)>resourceMax(p,'mana',4))fail('INVALID_RESOURCE','mage mana exceeded current cap',{playerId:p.playerId,value:p.publicResources.mana,max:resourceMax(p,'mana',4)});
    if(Number(p.publicResources?.toughnessCharges)>resourceMax(p,'toughnessCharges',2))fail('INVALID_RESOURCE','warrior toughness exceeded current cap',{playerId:p.playerId,value:p.publicResources.toughnessCharges,max:resourceMax(p,'toughnessCharges',2)});
    if(p.publicResources?.parity!=null&&![0,1].includes(p.publicResources.parity))fail('INVALID_RESOURCE','twins parity must be 0 or 1',{playerId:p.playerId,value:p.publicResources.parity});
    for(const [number,value] of Object.entries(p.engravings||{}))if(!finite(value)||value<0)fail('NEGATIVE_RESOURCE','negative/invalid engraving',{playerId:p.playerId,number,value});
    validateZone(p,run.combat?.privateByPlayer?.[p.playerId],'combat');
    validateZone(p,run.roomState?.privateByPlayer?.[p.playerId],'room');
    if(p.status==='DOWNED'&&(run.combat?.turnSubmissions?.[p.playerId]||run.roomState?.turnSubmissions?.[p.playerId]))fail('DOWNED_PLAYER_SUBMITTED','DOWNED player participated in a card submission',{playerId:p.playerId,phase:run.phase});
    if(run.combat?.phase==='COMBAT_END'&&run.phase!=='COMBAT'){
      const leaked=Object.entries(PVE_RESOURCE_DEFS)
        .filter(([,def])=>def.resetScope==='COMBAT')
        .map(([key])=>key)
        .filter(key=>Object.hasOwn(p.publicResources||{},key));
      if(leaked.length)fail('COMBAT_RESOURCE_LEAK','combat-only resources remained after combat end',{playerId:p.playerId,resources:leaked});
    }
  }
  for(const p of run.players||[])assertNoHiddenInfo(projectRun(run,p.playerId),p.playerId);
  return true;
}

export function deterministicBotDecisionFromView(view,playerId,{policy='reference',seed=view.seed}={}){
  assertNoHiddenInfo(view,playerId);
  const player=view.players.find(p=>p.playerId===playerId);
  if(!player||player.status==='DOWNED')return null;
  const cards=legalCardsFromView(view,playerId);
  if(!cards.length)return null;
  let ordered=[...cards];
  if(policy==='resource_starvation'||policy==='collision_farm'||(policy==='reference'&&player.characterId==='rogue'))ordered.sort((a,b)=>a.baseNumber-b.baseNumber||a.id.localeCompare(b.id));
  else ordered.sort((a,b)=>b.baseNumber-a.baseNumber||a.id.localeCompare(b.id));
  const top=ordered.filter(c=>c.baseNumber===ordered[0].baseNumber);
  const card=top[seededIndex(seed,`${policy}:${view.currentRoomNodeId}:${view.combat?.turn}:${playerId}`,top.length)];
  let skillIntent=false;
  if(policy!=='resource_starvation'){
    if(player.characterId==='gunner'&&player.publicResources.fullBurstReady)skillIntent=true;
    if(player.characterId==='mage'){
      const mana=player.publicResources.mana||0,maxMana=resourceMax(player,'mana',4);
      if(mana>=(maxMana>=6?6:2))skillIntent=true;
    }
    if(player.characterId==='warrior'&&(player.publicResources.toughnessCharges||0)>0&&card.baseNumber>=5)skillIntent=true;
  }else{
    if(player.characterId==='mage'&&(player.publicResources.mana||0)>=2)skillIntent=true;
    if(player.characterId==='warrior'&&(player.publicResources.toughnessCharges||0)>0)skillIntent=true;
    if(player.characterId==='gunner'&&player.publicResources.fullBurstReady)skillIntent=true;
  }
  return {cardInstanceId:card.id,skillIntent};
}
export function deterministicBotDecision(run,playerId,options={}){
  const view=projectRun(run,playerId);
  return deterministicBotDecisionFromView(view,playerId,{...options,seed:options.seed??view.seed});
}

function referenceTurnPlan(run,seed){
  const contextKey=`${run.currentRoomNodeId||run.combat?.monster?.id||'combat'}:turn:${run.combat?.turn||0}`;
  const intents=[],views=new Map();
  for(const p of run.players){
    if(p.status==='DOWNED'||run.combat.turnSubmissions[p.playerId])continue;
    const view=projectRun(run,p.playerId);assertNoHiddenInfo(view,p.playerId);
    const intent=buildReferenceIntent(view,p.playerId,{seed,contextKey});
    if(!intent)fail('BOT_NO_LEGAL_ACTION','reference bot could not broadcast a legal intent',{seed,playerId:p.playerId,turn:run.combat.turn});
    intents.push(intent);views.set(p.playerId,view);
  }
  const negotiated=negotiateReferenceIntents(intents,{seed,contextKey});
  const submissions=[];
  for(const decision of negotiated.decisions){
    const view=views.get(decision.playerId);
    const choices=legalCardsFromView(view,decision.playerId)
      .filter(card=>card.baseNumber===decision.baseNumber)
      .sort((a,b)=>a.id.localeCompare(b.id));
    if(!choices.length)fail('BOT_NO_LEGAL_ACTION','negotiated reference card is unavailable in the owner projection',{
      seed,playerId:decision.playerId,turn:run.combat.turn,baseNumber:decision.baseNumber
    });
    const card=choices[seededIndex(seed,`${contextKey}:${decision.playerId}:physical:${decision.baseNumber}`,choices.length)];
    submissions.push({playerId:decision.playerId,cardInstanceId:card.id,skillIntent:decision.skillIntent});
  }
  return {
    submissions,
    telemetry:{
      turn:run.combat.turn,
      order:negotiated.order,
      records:negotiated.decisions.map(x=>({...x,actualCollision:false,actualCollisionInvalidated:false,validAttack:false,damage:0}))
    }
  };
}

export function simulateCombat({seed,characterIds,augmentIdsByPlayer=[],monsterDef=F1_MONSTER_DEFINITIONS.f1_armored_boar,policy='reference',flame=4,maxTurns=HARD_MAX_TURNS,caseId='generic-combat'}){
  const run=makeCombatRun(seed,{caseId,characterIds,augmentIdsByPlayer,flame,monsterDef});
  let actions=0,resolves=0;
  const referenceTurns=[],numberMutationTurns=[];
  while(run.phase==='COMBAT'){
    if(run.combat.turn>maxTurns)fail('INFINITE_LOOP','simulation exceeded turn ceiling',{seed,turn:run.combat.turn});
    const turn=run.combat.turn;
    let referenceTelemetry=null;
    if(policy==='reference'){
      const plan=referenceTurnPlan(run,seed);referenceTelemetry=plan.telemetry;
      for(const submission of plan.submissions){
        submitCard(run,submission.playerId,submission.cardInstanceId,submission.skillIntent);actions++;
        assertRunInvariants(run);
      }
    }else if(policy==='number_mutation'){
      const contextKey=`${run.currentRoomNodeId||run.combat?.monster?.id||'combat'}:turn:${turn}`;
      const intents=[],views=new Map();
      for(const p of run.players){
        if(p.status==='DOWNED'||run.combat.turnSubmissions[p.playerId])continue;
        const view=projectRun(run,p.playerId);assertNoHiddenInfo(view,p.playerId);
        const intent=buildNumberMutationIntent(view,p.playerId);
        if(!intent)fail('BOT_NO_LEGAL_ACTION','T05 bot could not build an owner intent',{seed,playerId:p.playerId,turn});
        intents.push(intent);views.set(p.playerId,view);
      }
      const plan=planNumberMutationTurn(intents,{seed,contextKey});
      for(const decision of plan.decisions){
        const view=views.get(decision.playerId);
        const choices=legalCardsFromView(view,decision.playerId)
          .filter(card=>card.baseNumber===decision.baseNumber)
          .sort((a,b)=>a.id.localeCompare(b.id));
        if(!choices.length)fail('BOT_NO_LEGAL_ACTION','T05 negotiated card unavailable in owner projection',{seed,turn,decision});
        const card=choices[seededIndex(seed,`${contextKey}:${decision.playerId}:physical:${decision.baseNumber}`,choices.length)];
        submitCard(run,decision.playerId,card.id,decision.skillIntent,decision.skillData);actions++;
        assertRunInvariants(run);
      }
    }else{
      for(const p of run.players){
        if(p.status==='DOWNED'||run.combat.turnSubmissions[p.playerId])continue;
        const view=projectRun(run,p.playerId);
        const decision=deterministicBotDecisionFromView(view,p.playerId,{policy,seed});
        if(!decision)fail('SOFTLOCK','active player has no legal bot action',{seed,playerId:p.playerId,turn});
        submitCard(run,p.playerId,decision.cardInstanceId,decision.skillIntent);actions++;
        assertRunInvariants(run);
      }
    }
    const result=resolveBasicTurn(run);actions++;resolves++;
    if(!result)fail('SOFTLOCK','resolve returned null with all bot actions submitted',{seed,turn});
    if(policy==='number_mutation'){
      numberMutationTurns.push({
        turn,
        numberHistories:structuredClone(result.numberHistories||[]),
        mutationEvents:structuredClone(result.mutationEvents||[])
      });
    }
    if(referenceTelemetry){
      const damageByPlayer={};
      for(const packet of result.damagePackets||[])damageByPlayer[packet.sourcePlayerId]=(damageByPlayer[packet.sourcePlayerId]||0)+(Number(packet.amount)||0);
      for(const record of referenceTelemetry.records){
        const card=(result.cards||[]).find(x=>x.playerId===record.playerId);
        record.actualCollision=Boolean(card&&(Number(card.collisionGroupSize)||1)>1);
        record.actualCollisionInvalidated=card?.invalidReason==='COLLISION';
        record.validAttack=Boolean(card?.valid);
        record.damage=damageByPlayer[record.playerId]||0;
      }
      referenceTurns.push(referenceTelemetry);
    }
    if(resolves>maxTurns)fail('INFINITE_LOOP','resolve count exceeded maximum',{seed,resolves});
    assertRunInvariants(run);
    if(run.phase==='COMBAT'&&run.combat.turn===turn)fail('SOFTLOCK','combat turn did not advance after resolve',{seed,turn});
    if(actions>HARD_MAX_ACTIONS)fail('INFINITE_LOOP','simulation action ceiling exceeded',{seed,actions});
  }
  const combatLog=(run._telemetryPending||[]).filter(x=>x.logType==='COMBAT').at(-1)?.payload||null;
  const effectLogs=(run._telemetryPending||[]).filter(x=>x.logType==='EFFECT').map(x=>x.payload);
  const effectTriggerCounts=effectLogs.reduce((m,x)=>(m[x.effect_id]=(m[x.effect_id]||0)+(Number(x.successful_trigger_count)||0),m),{});
  const combatMetric=combatLog?{
    roomType:combatLog.room_type,monsterId:combatLog.monster_id,outcome:combatLog.outcome,
    turns:combatLog.turn_count,partyDamage:combatLog.party_damage_total,
    partyDpt:combatLog.turn_count?combatLog.party_damage_total/combatLog.turn_count:0,
    playerDamage:structuredClone(combatLog.player_damage_total||{}),
    damageTaken:structuredClone(combatLog.damage_taken||{}),
    healingDone:structuredClone(combatLog.healing_done||{}),
    expGained:structuredClone(combatLog.exp_gained||{}),
    ko:Object.values(combatLog.down_count||{}).reduce((a,b)=>a+b,0),
    flameSpent:combatLog.flame_spent,
    collisions:Object.values(combatLog.collision_count||{}).reduce((a,b)=>a+b,0),
    validAttacks:Object.values(combatLog.valid_attack_count||{}).reduce((a,b)=>a+b,0),
    effectTriggerCounts
  }:null;
  return {
    seed,outcome:run.phase,actions,resolves,finalFlame:run.flame,effectTriggerCounts,
    players:run.players.map(p=>({playerId:p.playerId,characterId:p.characterId,hp:p.hp,status:p.status,runGold:p.runGold,growthExp:p.growthExp})),
    combat:semantic(run.combat),combats:combatMetric?[combatMetric]:[],
    referenceTurns,
    referenceCommunication:summarizeReferenceTurns(referenceTurns),
    numberMutationTurns
  };
}

const T05_CHARACTER_IDS=Object.freeze(['mage','vampire','imp','warrior']);
const T05_AUGMENTS=Object.freeze([['aug-111'],['aug-301'],['aug-181'],['aug-031']]);
const T05_FIXTURE_MONSTER=Object.freeze({
  id:'t05_fixture_dummy',name:'T05 Mutation Dummy',tier:'NORMAL',baseHp:999,
  pattern:[{type:'CHARGE',telegraphText:'fixture',payload:{}}]
});
function t05CardId(run,playerId,number){
  const view=projectRun(run,playerId);assertNoHiddenInfo(view,playerId);
  const choices=legalCardsFromView(view,playerId).filter(card=>card.baseNumber===number).sort((a,b)=>a.id.localeCompare(b.id));
  return choices[0]?.id||null;
}
function t05Fixture(seed,id,{numbers,skills={},mageMana=null,thrallId=null,dominance=null}){
  const run=makeCombatRun(`${seed}:${id}`,{
    caseId:`T05-${id}`,characterIds:T05_CHARACTER_IDS,augmentIdsByPlayer:T05_AUGMENTS,flame:4,monsterDef:T05_FIXTURE_MONSTER
  });
  if(mageMana!=null)run.players[0].publicResources.mana=mageMana;
  if(thrallId)run.players[1].publicResources.thrallPlayerId=thrallId;
  if(dominance!=null)run.players[1].publicResources.dominance=dominance;
  const ownershipBefore=Object.fromEntries(run.players.map(p=>[p.playerId,p.cardPool.map(card=>card.id)]));
  for(let i=0;i<numbers.length;i++){
    const pid=`p${i}`,cardId=t05CardId(run,pid,numbers[i]);
    if(!cardId)fail('T05_FIXTURE_CARD_MISSING',`${id} missing requested card`,{pid,number:numbers[i]});
    const skill=skills[pid]||{};
    submitCard(run,pid,cardId,Boolean(skill.enabled),skill.data??null);
  }
  const result=resolveBasicTurn(run);
  if(!result)fail('SOFTLOCK',`${id} did not resolve`);
  assertRunInvariants(run);
  const ownershipAfter=Object.fromEntries(run.players.map(p=>[p.playerId,p.cardPool.map(card=>card.id)]));
  if(stableStringify(ownershipBefore)!==stableStringify(ownershipAfter))fail('NUMBER_04_OWNERSHIP_CHANGED',`${id} changed physical ownership`);
  return {
    id,
    histories:structuredClone(result.numberHistories||[]),
    events:structuredClone(result.mutationEvents||[]),
    combatEvents:structuredClone(result.events||[]),
    phaseTrace:[...(result.phaseTrace||[])],
    totalDamage:result.totalDamage,
    ownershipStable:true
  };
}
export function runT05Fixtures(seed){
  const fixtures=[
    t05Fixture(seed,'F1_SELF_MODIFY_ONLY',{
      numbers:[3,1,2,5],mageMana:2,skills:{p0:{enabled:true,data:{direction:1,manaSpend:2}}}
    }),
    t05Fixture(seed,'F2_VAMPIRE_SWAP_ONLY',{
      numbers:[2,5,1,3],thrallId:'p0',skills:{p1:{enabled:true}}
    }),
    t05Fixture(seed,'F3_IMP_MULTI_STEAL',{
      numbers:[3,3,3,5]
    }),
    t05Fixture(seed,'F4_FULL_CHAIN',{
      numbers:[3,5,4,2],mageMana:2,thrallId:'p0',
      skills:{p0:{enabled:true,data:{direction:1,manaSpend:2}},p1:{enabled:true}}
    }),
    t05Fixture(seed,'F5_KNIGHT_POST_MUTATION_IMMUNITY',{
      numbers:[1,3,3,4],skills:{p3:{enabled:true}}
    }),
    t05Fixture(seed,'F6_STEAL_CREATES_COLLISION',{
      numbers:[3,4,3,2]
    }),
    t05Fixture(seed,'F7_STEAL_REMOVES_COLLISION',{
      numbers:[3,1,3,5]
    }),
    t05Fixture(seed,'F8_SWAP_CREATES_IMP_TARGET',{
      numbers:[4,5,4,2],thrallId:'p0',skills:{p1:{enabled:true}}
    }),
    t05Fixture(seed,'F9_REVERSE_MATH_MINUS',{
      numbers:[3,5,1,4],mageMana:2,skills:{p0:{enabled:true,data:{direction:-1,manaSpend:2}}}
    }),
    t05Fixture(seed,'F10_STEAL_MIN_BOUNDARY',{
      numbers:[1,5,1,4]
    }),
    t05Fixture(seed,'F11_BOLD_STEAL_BONUS',{
      numbers:[3,3,3,4]
    }),
    t05Fixture(seed,'F12_FULL_THRALL_DOMINANCE_DAMAGE',{
      numbers:[2,5,1,4],thrallId:'p0',dominance:2,skills:{p1:{enabled:true}}
    })
  ];
  return {scenarioId:'T05_FIXTURES',seed,status:'PASS',fixtures};
}
function collisionPairs(histories,field){
  const pairs=new Set();
  for(let i=0;i<histories.length;i++)for(let j=i+1;j<histories.length;j++){
    if(histories[i][field]===histories[j][field]){
      const ids=[histories[i].playerId,histories[j].playerId].sort();
      pairs.add(ids.join('|'));
    }
  }
  return pairs;
}
function mutationMetrics(turns){
  const metrics={
    combatCount:1,selfModifications:0,swaps:0,stealEvents:0,stolenAmount:0,
    mutationCreatedCollisionCount:0,mutationResolvedCollisionCount:0,
    knightImmunityUses:0,invalidMutationAttempts:0,numberHistoryMismatchCount:0,deterministicReplayMismatchCount:0
  };
  for(const turn of turns||[]){
    metrics.selfModifications+=(turn.mutationEvents||[]).filter(e=>e.phase==='SELF_MODIFY').length;
    metrics.swaps+=(turn.mutationEvents||[]).filter(e=>e.phase==='PRE_COLLISION_SWAP').length;
    const summaries=(turn.mutationEvents||[]).filter(e=>e.effectId==='imp-steal-summary');
    metrics.stealEvents+=summaries.length;
    metrics.stolenAmount+=summaries.reduce((sum,e)=>sum+(Number(e.totalActuallyStolen)||0),0);
    const base=collisionPairs(turn.numberHistories||[],'baseNumber');
    const final=collisionPairs(turn.numberHistories||[],'finalNumber');
    for(const pair of final)if(!base.has(pair))metrics.mutationCreatedCollisionCount++;
    for(const pair of base)if(!final.has(pair))metrics.mutationResolvedCollisionCount++;
    metrics.knightImmunityUses+=(turn.numberHistories||[]).filter(h=>h.collisionImmune&&(h.collisionGroup||[]).length>1).length;
  }
  return metrics;
}
export function runT05(seed){
  const fixtures=runT05Fixtures(seed);
  const stress=simulateCombat({
    seed:`${seed}:stress`,caseId:'T05-stress',characterIds:T05_CHARACTER_IDS,augmentIdsByPlayer:T05_AUGMENTS,
    monsterDef:F1_MONSTER_DEFINITIONS.f1_armored_boar,policy:'number_mutation',flame:4
  });
  const metrics=mutationMetrics(stress.numberMutationTurns);
  return {
    scenarioId:'T05',seed,status:'PASS',outcome:stress.outcome,actionCount:stress.actions,
    fixtures:fixtures.fixtures,numberMutationTurns:stress.numberMutationTurns,
    mutationMetrics:metrics,combats:stress.combats,effectTriggerCounts:stress.effectTriggerCounts,finalFlame:stress.finalFlame
  };
}
export function t05GoldenComparable(result){
  return {
    scenarioId:result.scenarioId,status:result.status,
    fixtures:(result.fixtures||[]).map(f=>({
      id:f.id,
      histories:f.histories.map(h=>({
        playerId:h.playerId,cardInstanceId:h.cardInstanceId,baseNumber:h.baseNumber,
        selfModifiedNumber:h.selfModifiedNumber,postSwapNumber:h.postSwapNumber,
        postStealNumber:h.postStealNumber,finalNumber:h.finalNumber,
        collisionGroup:h.collisionGroup,collisionImmune:h.collisionImmune,valid:h.valid,damage:h.damage
      })),
      events:f.events,ownershipStable:f.ownershipStable
    }))
  };
}

export function runT00(seed){
  const baseParty=[
    {characterId:'adventurer',augments:['aug-001']},
    {characterId:'warrior',augments:['aug-031']},
    {characterId:'mage',augments:['aug-091']},
    {characterId:'rogue',augments:['aug-061']}
  ];
  const seatRotation=seededIndex(seed,'T00:reference-seat-rotation',baseParty.length);
  const party=[...baseParty.slice(seatRotation),...baseParty.slice(0,seatRotation)];
  const characterIds=party.map(x=>x.characterId);
  const augmentIdsByPlayer=party.map(x=>x.augments);
  const encounters=[
    ['normal',F1_MONSTER_DEFINITIONS.f1_armored_boar],
    ['elite',F1_MONSTER_DEFINITIONS.f1_echo_bat],
    ['boss',F1_MONSTER_DEFINITIONS.f1_fallen_lord]
  ];
  const runs=encounters.map(([caseId,monsterDef])=>simulateCombat({
    seed:`${seed}:${caseId}`,caseId:`T00-${caseId}`,characterIds,augmentIdsByPlayer,monsterDef,policy:'reference',flame:4
  }));
  const combats=runs.flatMap(x=>x.combats||[]);
  const effectTriggerCounts={};
  for(const r of runs)for(const [id,count] of Object.entries(r.effectTriggerCounts||{}))effectTriggerCounts[id]=(effectTriggerCounts[id]||0)+count;
  const expectedAugmentEffects=['aug-001-veteran-valid','aug-031-toughness-cap','aug-061-sneaky-success','aug-091-mana-cap'];
  if(expectedAugmentEffects.some(id=>(effectTriggerCounts[id]||0)<1))fail('T00_EFFECT_NOT_EXERCISED','reference run did not exercise every T00 executable augment',{seed,effectTriggerCounts});
  const playerDamage=Object.fromEntries(characterIds.map((id,i)=>[id,combats.reduce((s,x)=>s+(Number(x.playerDamage?.['p'+i])||0),0)]));
  const partyDamage=Object.values(playerDamage).reduce((a,b)=>a+b,0);
  const characterDamageShare=Object.fromEntries(Object.entries(playerDamage).map(([id,v])=>[id,partyDamage?v/partyDamage:0]));
  const referenceTurns=runs.flatMap(x=>x.referenceTurns||[]);
  const referenceCommunication=summarizeReferenceTurns(referenceTurns);
  return {
    scenarioId:'T00',seed,status:'PASS',
    outcome:runs.some(x=>x.outcome==='RUN_FAILED')?'RUN_FAILED':'COMPLETED',
    actionCount:runs.reduce((s,x)=>s+x.actions,0),
    combats,effectTriggerCounts,characterDamageShare,referenceTurns,referenceCommunication,seatRotation,
    expGainByCharacter:Object.fromEntries(characterIds.map((id,i)=>[id,combats.reduce((s,x)=>s+(Number(x.expGained?.['p'+i])||0),0)])),
    finalFlame:runs.at(-1)?.finalFlame??null
  };
}

export function runScenario(scenarioId,seed){
  const def=STRESS_SCENARIOS.find(x=>x.id===scenarioId);
  if(!def)fail('UNKNOWN_SCENARIO',`unknown stress scenario ${scenarioId}`);
  const availability=scenarioAvailability(def);
  if(!availability.available)return {scenarioId,seed,status:'SKIP',skipReasons:availability.reasons};
  if(scenarioId==='T00')return runT00(seed);
  if(scenarioId==='T05')return runT05(seed);
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
    if(room==='BOSS'&&rows.some(x=>x.turns>=30))warnings.push({code:'BOSS_30_TURNS_OR_MORE',roomType:room,maxTurns:Math.max(...rows.map(x=>x.turns))});
    if(room==='BOSS'&&rows.some(x=>x.turns<=4))warnings.push({code:'BOSS_4_TURNS_OR_LESS',roomType:room,minTurns:Math.min(...rows.map(x=>x.turns))});
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
