import crypto from 'node:crypto';
import {PVE_CHARACTER_DEFS,isCardSelectableForCharacter,activateImmediateCharacterSkill,PveSkillError,resolvePostCollisionEffects} from '../supabase/functions/game-api/pve/characters.js';
import {AUGMENT_DEFINITIONS,AUGMENT_BY_ID} from '../supabase/functions/game-api/pve/augment-catalog.js';
import {PVE_RESOURCE_DEFS,resourceMax} from '../supabase/functions/game-api/pve/resources.js';
import {newPlayerRunState,newCombatState} from '../supabase/functions/game-api/pve/model.js';
import {beginTurn,submitCard,resolveBasicTurn} from '../supabase/functions/game-api/pve/combat.js';
import {applyMonsterDamage} from '../supabase/functions/game-api/pve/monster.js';
import {projectRun} from '../supabase/functions/game-api/pve/projection.js';
import {F1_RELIC_DEFINITIONS} from '../supabase/functions/game-api/pve/content-f1.js';
import {STRESS_REFERENCE_MONSTERS as F1_MONSTER_DEFINITIONS} from './pve-stress-reference-monsters.mjs';
import {installRelicCatalog} from '../supabase/functions/game-api/pve/relics.js';
import {buildReferenceIntent,negotiateReferenceIntents,summarizeReferenceTurns} from './pve-reference-policy.mjs';
import {buildNumberMutationIntent,planNumberMutationTurn} from './pve-number-mutation-policy.mjs';
import {buildResourceStarvationDecision,invalidResourceProbe} from './pve-resource-starvation-policy.mjs';
import {buildCollisionFarmIntent,planCollisionFarmTurn,planCollisionSafeTurn} from './pve-collision-farm-policy.mjs';
import {buildSustainIntent,planSustainTurn} from './pve-sustain-fortress-policy.mjs';
import {runT03Scenario,t03GoldenComparable as t03Golden} from './pve-t03-sustain.mjs';
import {buildBurstIntent,planBurstTurn} from './pve-burst-ceiling-policy.mjs';
import {runT02Scenario,t02GoldenComparable as t02Golden} from './pve-t02-burst.mjs';
import {buildRecoveryIntent,planRecoveryTurn} from './pve-recovery-loop-policy.mjs';
import {runT06Scenario,t06GoldenComparable as t06Golden,assertRecoveryTurn} from './pve-t06-recovery.mjs';

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
const EXECUTABLE_RUNTIME_CAPABILITIES=new Set([
  'warrior_basic_resource',
  'mage_basic_resource',
  'prophet_base',
  'prophet_revelation',
  'prophet_recovery',
  'gunner_basic_cycle',
  'gunner_full_burst',
  'resource_starvation_policy',
  'berserker_base',
  'crush_knight',
  'imp_base',
  'bold_steal',
  'immortal_fighter',
  'vampire_base',
  'full_thrall',
  'collision_farm_policy',
  'collision_safe_policy',
  'guardian_wall','transfusion','white_mage','sustain_policy','t03_runner','direct_damage_identity',
  'demon_swordsman_base','martial_artist_base','full_barrage','released_demon_sword','one_hit_kill','blood_frenzy','burst_policy','steady_burst_policy','burst_chain_identity','t02_runner',
  'twins_base','fate_manipulator','aerial_acrobatics','devouring_ghost_slash','recovery_loop_policy','steady_recovery_policy','recovery_chain_identity','t06_runner'
]);
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
    characters:['warrior','mage','prophet','gunner'],builds:[],
    requires:['warrior_basic_resource','mage_basic_resource','prophet_base','prophet_revelation','prophet_recovery','gunner_basic_cycle','gunner_full_burst','resource_starvation_policy']
  },
  {id:'T14',name:'Flame Boundary',runner:'synthetic',policy:'fixture',characters:[],builds:[]},
  {
    id:'T02',name:'Burst Ceiling',runner:'boss',policy:'burst',
    characters:['gunner','demon_swordsman','martial_artist','berserker'],
    builds:[['gunner','전탄 난사'],['demon_swordsman','해방된 귀검'],['martial_artist','일격필살'],['berserker','피의 광전']],
    requires:['gunner_basic_cycle','gunner_full_burst','full_barrage','demon_swordsman_base','released_demon_sword','martial_artist_base','one_hit_kill','berserker_base','blood_frenzy','burst_policy','steady_burst_policy','burst_chain_identity','t02_runner']
  },
  {
    id:'T03',name:'Sustain Fortress',runner:'floor',policy:'sustain',
    characters:['warrior','vampire','berserker','mage'],
    builds:[['warrior','수호벽'],['vampire','수혈'],['berserker','불사 투사'],['mage','백마도사']],
    requires:['warrior_basic_resource','guardian_wall','vampire_base','transfusion','berserker_base','immortal_fighter','mage_basic_resource','white_mage','sustain_policy','t03_runner','direct_damage_identity']
  },
  {
    id:'T04',name:'Collision Farm',runner:'combat',policy:'collision_farm',
    characters:['warrior','imp','berserker','vampire'],
    builds:[['warrior','압살 기사'],['imp','대담한 슬쩍'],['berserker','불사 투사'],['vampire','완전한 권속']],
    requires:['warrior_basic_resource','crush_knight','imp_base','bold_steal','berserker_base','immortal_fighter','vampire_base','full_thrall','collision_farm_policy','collision_safe_policy']
  },
  {
    id:'T06',name:'Recovery Loop',runner:'combat',policy:'recovery',
    characters:['prophet','gunner','twins','demon_swordsman'],
    builds:[['prophet','운명 조작자'],['gunner','전탄 난사'],['twins','공중 곡예'],['demon_swordsman','포식 귀참']],
    requires:['prophet_base','prophet_revelation','fate_manipulator','gunner_basic_cycle','gunner_full_burst','full_barrage','twins_base','aerial_acrobatics','demon_swordsman_base','devouring_ghost_slash','recovery_loop_policy','steady_recovery_policy','recovery_chain_identity','t06_runner']
  }
]);

export function scenarioAvailability(def){
  const missingCharacters=(def.characters||[]).filter(id=>!Object.hasOwn(PVE_CHARACTER_DEFS,id));
  const missingBuildEffects=(def.builds||[]).filter(([characterId,build])=>!EXECUTABLE_BUILD_NAMES.has(`${characterId}:${build}`))
    .map(([characterId,build])=>({characterId,build}));
  const missingCapabilities=(def.requires||[]).filter(id=>!EXECUTABLE_RUNTIME_CAPABILITIES.has(id));
  const reasons=[];
  if(missingCharacters.length)reasons.push(`PVE character engine not implemented: ${missingCharacters.join(', ')}`);
  if(missingBuildEffects.length)reasons.push(`build effects are not executable (metadata-only or absent): ${missingBuildEffects.map(x=>`${x.characterId}/${x.build}`).join(', ')}`);
  if(missingCapabilities.length)reasons.push(`runtime capabilities are not executable: ${missingCapabilities.join(', ')}`);
  return {available:reasons.length===0,reasons,missingCharacters,missingBuildEffects,missingCapabilities};
}

export const CANONICAL_RULES=Object.freeze([
  {id:'RULE-01',topic:'Boss kill + full wipe',rule:'Flame 0에서 같은 resolve에 보스 처치와 파티 전원 DOWNED가 동시에 확정되면 RUN_FAILED가 boss clear보다 우선한다.'},
  {id:'RULE-02',topic:'Heal + lethal same resolve',rule:'lethal은 pending 상태로 두고 즉시 회복/보호/구조를 먼저 처리한 뒤 DOWN_RESOLVE에서 HP<=0인 플레이어만 DOWNED로 확정한다.'},
  {id:'RULE-03',topic:'Executable augments',rule:'390장 metadata는 유지하되 실제 effects 또는 명시적 special handler가 구현된 증강만 executable로 취급한다. metadata-only 증강은 stress scenario 활성 조건을 충족하지 않는다.'},
  {id:'RULE-04',topic:'DOWNED vs STUNNED_NEXT_TURN',rule:'DOWNED=쓰러짐/행동 불가, STUNNED_NEXT_TURN=기절/생존/다음 턴 자동 제출 대상으로 서로 다른 상태다.'},
  {id:'RULE-05',topic:'Combat-only resource lifecycle',rule:'COMBAT_END에서 resetScope=COMBAT 자원을 clear하고 COMBAT_START에서도 방어적으로 initialize한다. run-persistent 자원은 유지한다.'},
  {id:'RULE-T04-A',topic:'Zero-damage DIRECT and Revenge',rule:'DIRECT damage가 protection/reduction으로 actualDamage 0이 되면 Revenge를 획득하지 않는다. actualDamage>0일 때만 획득한다.'},
  {id:'RULE-T04-B',topic:'pendingDown + collision heal',rule:'현재 phase ordering에서 POST_COLLISION_EFFECTS가 MONSTER_ACTION과 DOWN_RESOLVE보다 먼저이므로 monster damage pendingDown 이후 같은 resolve collision heal은 구조적으로 발생하지 않는다.'},
  {id:'RULE-T03-A',topic:'Guardian Wall overwrite',rule:'기본 Tier-I 수호벽은 호위를 stack하지 않는다. 새 호위가 생성되면 기존 미소비 호위를 교체한다.'},
  {id:'RULE-T03-B',topic:'White Magic multi-target',rule:'Tier-I 백마도사는 여러 eligible 아군과 동시에 충돌하면 lobby seat가 가장 빠른 1명만 HP 1 회복한다.'},
  {id:'RULE-T02-A',topic:'Martial previous card',rule:'무투가의 직전 카드는 성공 여부와 무관하게 직전 턴 실제 공개된 final_number를 사용한다.'},
  {id:'RULE-T02-B',topic:'One-Hit Kill failure cost',rule:'일격필살은 유효 공격 성공 시에만 현재 Combo를 전부 소비하며 collision/invalid 실패 시 Combo를 소비하지 않는다.'},
  {id:'RULE-T02-C',topic:'Demon kill Devour precedence',rule:'귀검사 포식은 일반 유효 공격 총 +1, 막타 총 +3, 막타이면서 처치 턴 최고 피해면 총 +5이며 한 공격에는 가장 높은 조건 하나만 적용한다.'},
  {id:'RULE-T02-D',topic:'Released Demon Sword card lifecycle',rule:'해방된 귀검은 전투 포식 6에서 귀화하고 카드풀을 2/4/5/6 임시 풀로 교체한다. 4장을 모두 사용하거나 전투가 끝나면 원래 physical card pool과 zone을 복원하며 귀화 종료 포식은 0이다.'},
  {id:'RULE-T02-E',topic:'Full Burst follow-up trigger scope',rule:'전탄발사 follow-up은 남은 physical card별 피해 packet이며, 턴당 1회/첫 유효 공격/기본 ON_VALID_ATTACK 계열은 명시적 multi-hit 허용 없이는 follow-up마다 반복 발동하지 않는다.'}
]);

export const SPEC_AMBIGUITIES=Object.freeze([
  {
    id:'AMB-T05-MULTI-IMP',
    scenarioId:'T05',
    topic:'multiple Imp PRE_COLLISION_STEAL ordering',
    detail:'The current BETA rules define one Imp stealing from matching non-Imp players but do not define simultaneous ordering when multiple Imps are present. T05 contains exactly one Imp. The mutation resolver hard-fails MULTI_IMP_STEAL_UNDEFINED instead of inventing a rule.'
  },
  {
    id:'AMB-T09-SEER-PEEK-TARGET',
    scenarioId:'T09',
    topic:'Prophet Revelation target priority when multiple teammates are READY',
    detail:'PVE combat UX forbids direct player targeting, while the current Prophet base rule does not define a class-specific priority among multiple READY teammates. The executable T09 path uses the existing stable automatic-target convention: first eligible READY teammate by lobby seat. The reveal scope is fixed, but a future class-content rule may replace this target priority without changing resource semantics.'
  },
  {
    id:'AMB-T02-MARTIAL-COMBO-DAMAGE-TIMING',
    scenarioId:'T02',
    topic:'Martial Artist current-hit Combo damage timing',
    detail:'Canonical docs fix previous-card comparison to prior revealed final_number and define valid higher card => Combo +1, but do not explicitly say whether that same attack uses Combo before or after the increment. Runtime follows engine phase order CARD_VALIDATED before DAMAGE_BUILD, so the current valid higher attack uses the post-increment Combo. This is isolated as an ambiguity rather than a balance value.'
  },
  {
    id:'AMB-T06-RECOVER-PREVIOUS-CYCLE-CARD',
    scenarioId:'T06',
    topic:'Fate Manipulator recovery after target cycle reset',
    detail:'BETA v0.1 defines recovery from an ally used card but does not define an archive for cards belonging to a completed prior cycle. Runtime therefore treats only the target current-cycle spent zone as eligible. After Full Burst or Acrobatics creates a new cycle, prior-cycle cards are not recoverable unless a future canonical rule introduces an explicit cross-cycle archive.'
  },
  {
    id:'AMB-T06-TWINS-RECOVERY-CYCLE-COMPLETION',
    scenarioId:'T06',
    topic:'Recovered Twins card contribution to cycle completion',
    detail:'BETA v0.1 does not define how an extra recovered physical card changes Twins parity scheduling or cycle-completion accounting. Runtime does not invent an extra parity flip or forced reset. Fate Manipulator therefore limits Twins recovery candidates to cards whose addition leaves the current-cycle remaining zone fully consumable under the existing one-flip-per-turn parity rule.'
  }
]);

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
    if(Number(p.publicResources?.revelation)>resourceMax(p,'revelation',3))fail('INVALID_RESOURCE','prophet revelation exceeded current cap',{playerId:p.playerId,value:p.publicResources.revelation,max:resourceMax(p,'revelation',3)});
    if(Number(p.publicResources?.revenge)>resourceMax(p,'revenge',1))fail('INVALID_RESOURCE','berserker revenge exceeded current cap',{playerId:p.playerId,value:p.publicResources.revenge,max:resourceMax(p,'revenge',1)});
    if(Number(p.publicResources?.blood)>resourceMax(p,'blood',6))fail('INVALID_RESOURCE','vampire blood exceeded current cap',{playerId:p.playerId,value:p.publicResources.blood,max:resourceMax(p,'blood',6)});
    if(Number(p.publicResources?.combo)>resourceMax(p,'combo',3))fail('INVALID_RESOURCE','martial combo exceeded current cap',{playerId:p.playerId,value:p.publicResources.combo,max:resourceMax(p,'combo',3)});
    if(Number(p.publicResources?.devour)<0)fail('INVALID_RESOURCE','demon swordsman Devour became negative',{playerId:p.playerId,value:p.publicResources.devour});
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

function t09ResourceValue(player){
  if(player.characterId==='mage')return Number(player.publicResources.mana)||0;
  if(player.characterId==='warrior')return Number(player.publicResources.toughnessCharges)||0;
  if(player.characterId==='prophet')return Number(player.publicResources.revelation)||0;
  if(player.characterId==='gunner')return {
    fullBurstReady:player.publicResources.fullBurstReady===true,
    burstReadyCycle:Number(player.publicResources.burstReadyCycle)||0
  };
  return null;
}
function t09State(run,playerId){
  const player=run.players.find(p=>p.playerId===playerId),priv=run.combat?.privateByPlayer?.[playerId];
  return {
    resource:t09ResourceValue(player),
    cycle:priv?.cycleIndex??null,
    remaining:[...(priv?.remainingCardIds||[])],
    spent:[...(priv?.spentCardIds||[])],
    selectedCardId:priv?.selectedCardId??null,
    submission:run.combat?.turnSubmissions?.[playerId]?semantic(run.combat.turnSubmissions[playerId]):null,
    rngCounter:run.rngCounter
  };
}
function assertT09CardPartition(run,playerId){
  const player=run.players.find(p=>p.playerId===playerId),priv=run.combat?.privateByPlayer?.[playerId];
  if(!player||!priv)return;
  const pool=player.cardPool.map(card=>card.id),zones=[...(priv.remainingCardIds||[]),...(priv.spentCardIds||[])];
  if(new Set(zones).size!==zones.length)fail('CARD_DUPLICATION','T09 physical card is duplicated across zones',{playerId,zones});
  if(zones.length!==pool.length||pool.some(id=>!zones.includes(id)))fail('CARD_STATE_MISMATCH','T09 physical card left the cycle zones or a new card appeared',{playerId,pool,zones});
  if(run.phase==='COMBAT'&&!priv.remainingCardIds.length&&!run.combat.turnSubmissions[playerId])fail('EMPTY_HAND_SOFTLOCK','T09 active cycle has no remaining card without reset',{playerId,cycleIndex:priv.cycleIndex});
}
function attemptT09InvalidProbe(run,playerId,probe,turn){
  if(!probe)return null;
  const before=t09State(run,playerId);
  let caught=null;
  try{
    if(probe.kind==='IMMEDIATE_SKILL')activateImmediateCharacterSkill(run,run.players.find(p=>p.playerId===playerId));
    else submitCard(run,playerId,probe.cardInstanceId,probe.skillIntent,probe.skillData??null);
  }catch(error){caught=error;}
  if(!caught)fail('INVALID_REQUEST_ACCEPTED','T09 invalid request was unexpectedly accepted',{playerId,turn,probe});
  const code=caught instanceof PveSkillError?caught.code:(typeof caught?.code==='string'?caught.code:'UNSTRUCTURED_REJECTION');
  if(probe.expectedCode&&code!==probe.expectedCode)fail('INVALID_REJECTION_CODE','T09 rejection reason diverged',{playerId,turn,expected:probe.expectedCode,actual:code,message:caught.message});
  const after=t09State(run,playerId);
  if(stableStringify(before)!==stableStringify(after))fail('REJECTED_REQUEST_MUTATED_STATE','T09 rejected request changed resource/card/submission state',{playerId,turn,probe,before,after});
  assertT09CardPartition(run,playerId);
  return {skillRequested:true,skillAccepted:false,skillRejected:true,rejectReason:code};
}

function assertT04CollisionTurn(run,result,policyPlan){
  if(result.collisionResolutionPasses!==1||result.postCollisionEffectPasses!==1){
    fail('COLLISION_PHASE_REENTRY','collision resolution or post-collision effects ran more or less than once',{
      collisionResolutionPasses:result.collisionResolutionPasses,postCollisionEffectPasses:result.postCollisionEffectPasses
    });
  }
  const seenEvents=new Set();
  for(const group of result.collisionGroups||[]){
    if(seenEvents.has(group.collisionEventId))fail('COLLISION_REWARD_DUPLICATE','same collisionEventId appeared more than once',{collisionEventId:group.collisionEventId});
    seenEvents.add(group.collisionEventId);
    const memberCards=(result.cards||[]).filter(card=>(group.members||[]).includes(card.playerId));
    if(memberCards.length!==(group.members||[]).length||memberCards.some(card=>card.finalNumber!==group.finalNumber)){
      fail('COLLISION_FINAL_NUMBER_MISMATCH','collision group does not match finalNumber inputs',{group,memberCards});
    }
    if((Number(group.berserkerHeal)||0)>1)fail('BERSERKER_COLLISION_MULTI_HEAL','one collision event healed Berserker more than once',{group});
    const crushed=group.crushedCardIds||[];
    if(new Set(crushed).size!==crushed.length)fail('CRUSH_DUPLICATE_CARD','same card was crushed more than once',{group});
    for(const id of crushed){
      const card=(result.cards||[]).find(x=>x.cardInstanceId===id);
      if(!card||card.invalidReason!=='COLLISION'||card.valid)fail('CRUSH_NON_COLLISION_CARD','crushed card was not finally invalidated by collision',{group,id,card});
    }
    if((Number(group.recursiveCollisionTriggerCount)||0)!==0)fail('RECURSIVE_COLLISION_TRIGGER','collision reward triggered collision processing recursively',{group});
  }
  assertRunInvariants(run);
  return {
    turn:result.turn,
    policy:policyPlan?.policy||null,
    targetNumber:policyPlan?.targetNumber??null,
    intentionalParticipantIds:[...(policyPlan?.intentionalParticipantIds||[])],
    intentionalCollisionAttempt:Boolean(policyPlan?.intentionalCollisionAttempt),
    resolvedCards:structuredClone(result.cards||[]),
    numberHistories:structuredClone(result.numberHistories||[]),
    mutationEvents:structuredClone(result.mutationEvents||[]),
    collisionGroups:structuredClone(result.collisionGroups||[]),
    combatEvents:structuredClone((result.events||[]).filter(event=>
      ['THRALL_MARKED','BERSERKER_COLLISION_HEAL','KNIGHT_CRUSH_CAPTURE','BERSERKER_REVENGE_GAINED','BERSERKER_REVENGE_CONSUMED','BERSERKER_ATTACK_HP_COST'].includes(event.type)
    )),
    damagePackets:structuredClone(result.damagePackets||[]),
    phaseTrace:[...(result.phaseTrace||[])],
    hpAfter:Object.fromEntries(run.players.map(player=>[player.playerId,player.hp])),
    revengeAfter:Object.fromEntries(run.players.filter(p=>p.characterId==='berserker').map(player=>[player.playerId,Number(player.publicResources.revenge)||0]))
  };
}

function assertT02BurstTurn(run,result,policyPlan){
  const packets=result.damagePackets||[],ids=new Set(),roots=new Map(),sourceByChain=new Map();
  let recursiveFollowUpAttempts=0,duplicateDamagePacketCount=0,duplicateModifierCount=0;
  for(const packet of packets){
    if(!packet.damageEventId||ids.has(packet.damageEventId)){duplicateDamagePacketCount++;fail('DUPLICATE_DAMAGE_PACKET','T02 duplicate/missing damage packet identity',{packet});}
    ids.add(packet.damageEventId);
    if(!Number.isFinite(Number(packet.amount)))fail('INVALID_DAMAGE','T02 damage is NaN/Infinity',{packet});
    if((Number(packet.followUpDepth)||0)>1){recursiveFollowUpAttempts++;fail('FOLLOW_UP_DEPTH_EXCEEDED','T02 follow-up depth exceeded Tier-I bound',{packet});}
    const mods=packet.modifierIds||[];
    if(new Set(mods).size!==mods.length){duplicateModifierCount++;fail('DUPLICATE_DAMAGE_MODIFIER','same modifier applied twice to one packet',{packet});}
    if(!packet.followUp)roots.set(packet.damageEventId,packet);
    if(packet.followUp){
      const parent=packets.find(x=>x.damageEventId===packet.parentDamageEventId);
      if(!parent||parent.followUp||parent.burstChainId!==packet.burstChainId){recursiveFollowUpAttempts++;fail('RECURSIVE_FOLLOW_UP','follow-up parent/chain is recursive or invalid',{packet,parent});}
    }
    const used=sourceByChain.get(packet.burstChainId)||new Set();
    if(used.has(packet.sourceCardId))fail('FOLLOW_UP_CARD_DUPLICATE','same physical card used twice in one burst chain',{packet});
    used.add(packet.sourceCardId);sourceByChain.set(packet.burstChainId,used);
  }
  const damageByPlayer={};for(const p of packets)damageByPlayer[p.sourcePlayerId]=(damageByPlayer[p.sourcePlayerId]||0)+(Number(p.amount)||0);
  const resolvedByPlayer=Object.fromEntries((result.cards||[]).map(c=>[c.playerId,c]));
  const activeBurstEffects=[];
  for(const [pid,card] of Object.entries(resolvedByPlayer)){
    if(card.fullBurstOutcome==='SUCCESS')activeBurstEffects.push({playerId:pid,effect:'FULL_BURST'});
    if(card.finisherOutcome==='SUCCESS')activeBurstEffects.push({playerId:pid,effect:'ONE_HIT_KILL'});
    if(packets.some(p=>p.sourcePlayerId===pid&&String(p.sourceCardId).includes(':demon:')))activeBurstEffects.push({playerId:pid,effect:'DEMON_TRANSFORM'});
    if(packets.some(p=>p.sourcePlayerId===pid&&(p.modifierIds||[]).includes('AUG_121_BLOOD_FRENZY')))activeBurstEffects.push({playerId:pid,effect:'BLOOD_FRENZY'});
  }
  const events=result.events||[],thresholds=[...new Set(packets.flatMap(p=>p.bossThresholdsCrossed||[]))].sort((a,b)=>b-a);
  const playerDamages=Object.values(damageByPlayer);
  return {
    turn:result.turn,policy:policyPlan?.policy||null,decisions:structuredClone(policyPlan?.decisions||[]),
    isPersonalBurstTurn:activeBurstEffects.length>0,
    isPartyBurstTurn:new Set(activeBurstEffects.map(x=>x.playerId)).size>=2,
    activeBurstEffects,
    totalDamage:Number(result.totalDamage)||0,
    damageByPlayer,
    maxSingleCardDamage:packets.length?Math.max(...packets.map(p=>Number(p.amount)||0)):0,
    maxSinglePlayerTurnDamage:playerDamages.length?Math.max(...playerDamages):0,
    fullBurstFollowUpCount:packets.filter(p=>p.followUp).length,
    thresholdsCrossed:thresholds,bossThresholdsCrossed:thresholds.length,bossPhasesSkipped:'NOT_MEASURABLE',
    bossMaxHp:run.combat?.monster?.maxHp??null,bossHpAfter:run.combat?.monster?.hp??null,
    transformationCount:events.filter(e=>e.type==='DEMON_TRANSFORMED').length,
    oneHitKillUses:events.filter(e=>e.type==='ONE_HIT_KILL_CONSUMED').length,
    comboConsumed:events.filter(e=>e.type==='ONE_HIT_KILL_CONSUMED').reduce((n,e)=>n+(Number(e.comboConsumed)||0),0),
    bloodFrenzyBonus:packets.filter(p=>(p.modifierIds||[]).includes('AUG_121_BLOOD_FRENZY')).reduce((n,p)=>n+(Number(p.augmentBonus)||0),0),
    berserkerHpCost:events.filter(e=>e.type==='BERSERKER_ATTACK_HP_COST').reduce((n,e)=>n+(Number(e.amount)||0),0),
    devourGained:events.filter(e=>e.type==='DEVOUR_GAINED').reduce((n,e)=>n+(Number(e.amount)||0),0),
    recursiveFollowUpAttempts,duplicateDamagePacketCount,duplicateModifierCount,
    packets:structuredClone(packets.map(p=>({
      damageEventId:p.damageEventId,rootActionId:p.rootActionId,burstChainId:p.burstChainId,parentDamageEventId:p.parentDamageEventId,
      turn:p.turn,playerId:p.playerId,sourcePlayerId:p.sourcePlayerId,sourceClass:p.sourceClass,sourceCardId:p.sourceCardId,baseNumber:p.baseNumber,
      baseDamage:p.baseDamage,classBonus:p.classBonus,augmentBonus:p.augmentBonus,followUpDamage:p.followUpDamage,totalDamage:p.amount,followUp:p.followUp,
      followUpDepth:p.followUpDepth,modifierIds:p.modifierIds,bossHpBefore:p.bossHpBefore,bossHpAfter:p.bossHpAfter,
      bossThresholdsCrossed:p.bossThresholdsCrossed,bossPhasesSkipped:p.bossPhasesSkipped
    }))),
    resources:Object.fromEntries(run.players.map(p=>[p.playerId,{combo:Number(p.publicResources.combo)||0,devour:Number(p.publicResources.devour)||0,hp:p.hp,transformationActive:Boolean(p.publicResources.transformationActive)}]))
  };
}

function assertT03SustainTurn(run,result,policyPlan){
  const events=result.events||[];
  const damageEvents=events.filter(e=>e.type==='PLAYER_DAMAGED');
  const redirects=events.filter(e=>e.type==='DAMAGE_REDIRECTED');
  const seenDamage=new Set();
  for(const event of damageEvents){
    if(!event.damageEventId)fail('DAMAGE_EVENT_ID_MISSING','T03 damage event is missing stable identity',{event});
    if(seenDamage.has(event.damageEventId))fail('DAMAGE_PACKET_DUPLICATE','same damage packet applied more than once',{damageEventId:event.damageEventId});
    seenDamage.add(event.damageEventId);
    if((Number(event.amount)||0)<0||(Number(event.preventedDamage)||0)<0)fail('INVALID_DAMAGE','negative sustain damage metric',{event});
  }
  const seenRedirect=new Set();
  for(const event of redirects){
    if(seenRedirect.has(event.damageEventId))fail('DAMAGE_REDIRECT_DUPLICATE','one damage event redirected more than once',{event});
    seenRedirect.add(event.damageEventId);
    const applied=damageEvents.filter(x=>x.damageEventId===event.damageEventId);
    if(applied.length!==1||applied[0].playerId!==event.redirectedTarget)fail('DAMAGE_REDIRECT_SPLIT','redirected damage also hit original target or wrong target',{event,applied});
    if(applied[0].playerId===event.originalTarget)fail('DAMAGE_REDIRECT_ORIGINAL_HIT','original target took redirected damage',{event,applied});
  }
  const sourceHealEvents=events.filter(e=>['TRANSFUSION_USED','WHITE_MAGIC_HEAL','BERSERKER_COLLISION_HEAL'].includes(e.type)&&e.healEventId);
  const sourceIds=new Set();
  for(const event of sourceHealEvents){
    if(sourceIds.has(event.healEventId))fail('HEAL_EFFECT_REENTRY','same sustain heal effect executed more than once',{event});
    sourceIds.add(event.healEventId);
  }
  const appliedHealEvents=events.filter(e=>e.type==='PLAYER_HEALED'&&e.healEventId);
  const appliedIds=new Set();
  for(const event of appliedHealEvents){
    if(appliedIds.has(event.healEventId))fail('HEAL_DUPLICATE_APPLICATION','same heal event applied twice',{event});
    appliedIds.add(event.healEventId);
  }
  const rawIncomingDamage=damageEvents.reduce((n,e)=>n+(Number(e.rawDamage)||0),0);
  const actualDamage=damageEvents.reduce((n,e)=>n+(Number(e.amount)||0),0);
  const preventedDamage=damageEvents.reduce((n,e)=>n+(Number(e.preventedDamage)||0),0);
  const healing=appliedHealEvents.reduce((n,e)=>n+(Number(e.amount)||0),0);
  const wastedHeal=sourceHealEvents.reduce((n,e)=>n+(Number(e.wastedHeal)||0),0);
  return {
    turn:result.turn,policy:policyPlan?.policy||null,
    decisions:structuredClone(policyPlan?.decisions||[]),
    events:structuredClone(events.filter(e=>[
      'GUARDIAN_WALL_RESCUE','DAMAGE_REDIRECTED','PLAYER_DAMAGED','PLAYER_HEALED','TRANSFUSION_USED',
      'VAMPIRE_BLOOD_GAINED','WHITE_MAGIC_HEAL','BERSERKER_COLLISION_HEAL','BERSERKER_REVENGE_GAINED','BERSERKER_REVENGE_CONSUMED'
    ].includes(e.type))),
    rawIncomingDamage,redirectedDamage:redirects.reduce((n,e)=>n+(Number(e.damageBeforeReduction)||0),0),
    preventedDamage,actualDamage,healing,wastedHeal,
    healEvents:appliedHealEvents.length,protectionEvents:damageEvents.filter(e=>(Number(e.preventedDamage)||0)>0).length,
    redirectEvents:redirects.length,revengeGains:events.filter(e=>e.type==='BERSERKER_REVENGE_GAINED').length,
    collisionHeals:events.filter(e=>e.type==='BERSERKER_COLLISION_HEAL').reduce((n,e)=>n+(Number(e.amount)||0),0),
    transfusions:events.filter(e=>e.type==='TRANSFUSION_USED').length,
    whiteMagicHeals:events.filter(e=>e.type==='WHITE_MAGIC_HEAL').reduce((n,e)=>n+(Number(e.amount)||0),0),
    hp1Rescues:appliedHealEvents.filter(e=>Number(e.before)===1&&Number(e.after)>1).length,
    pendingDownSaved:0,
    recursiveHealCount:0,recursiveRedirectCount:0,
    hpAfter:Object.fromEntries(run.players.map(p=>[p.playerId,p.hp])),
    bloodAfter:Object.fromEntries(run.players.filter(p=>p.characterId==='vampire').map(p=>[p.playerId,Number(p.publicResources.blood)||0])),
    manaAfter:Object.fromEntries(run.players.filter(p=>p.characterId==='mage').map(p=>[p.playerId,Number(p.publicResources.mana)||0])),
    revengeAfter:Object.fromEntries(run.players.filter(p=>p.characterId==='berserker').map(p=>[p.playerId,Number(p.publicResources.revenge)||0]))
  };
}

export function simulateCombat({seed,characterIds,augmentIdsByPlayer=[],monsterDef=F1_MONSTER_DEFINITIONS.f1_armored_boar,policy='reference',flame=4,maxTurns=HARD_MAX_TURNS,caseId='generic-combat'}){
  const run=makeCombatRun(seed,{caseId,characterIds,augmentIdsByPlayer,flame,monsterDef});
  if(policy==='resource_starvation'){
    const prophet=run.players.find(p=>p.characterId==='prophet');
    if(prophet)prophet.publicResources.revelation=Math.min(resourceMax(prophet,'revelation',3),1);
  }
  let actions=0,resolves=0;
  const referenceTurns=[],numberMutationTurns=[],resourceTimeline=[],collisionTurns=[],sustainTurns=[],burstTurns=[],recoveryTurns=[];
  const t09PriorResource=new Map(run.players.map(p=>[p.playerId,t09ResourceValue(p)]));
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
    }else if(policy==='resource_starvation'){
      const contextKey=`${run.currentRoomNodeId||run.combat?.monster?.id||'combat'}:turn:${turn}`;
      const active=run.players.filter(p=>p.status!=='DOWNED'&&!run.combat.turnSubmissions[p.playerId]);
      const records=new Map();
      for(const p of active){
        const view=projectRun(run,p.playerId);assertNoHiddenInfo(view,p.playerId);
        const start=t09State(run,p.playerId);
        const probe=invalidResourceProbe(view,p.playerId);
        const rejection=attemptT09InvalidProbe(run,p.playerId,probe,turn);
        if(rejection)actions++;
        records.set(p.playerId,{
          turn,playerId:p.playerId,classId:p.characterId,
          resourceBefore:structuredClone(start.resource),resourceGained:0,resourceSpent:0,resourceAfter:null,
          skillRequested:rejection?1:0,skillAccepted:0,skillRejected:rejection?1:0,
          rejectReasons:rejection?[rejection.rejectReason]:[],
          cycleBefore:start.cycle,cycleAfter:null,
          remainingCardsBefore:start.remaining.length,remainingCardsAfter:null,recoveredCardId:null
        });
      }
      const ordered=[...active].sort((a,b)=>{
        const ap=a.characterId==='prophet'?1:0,bp=b.characterId==='prophet'?1:0;
        return ap-bp||a.seat-b.seat;
      });
      for(const p of ordered.filter(x=>x.characterId!=='prophet')){
        const view=projectRun(run,p.playerId);assertNoHiddenInfo(view,p.playerId);
        const decision=buildResourceStarvationDecision(view,p.playerId,{seed,contextKey});
        if(!decision)fail('SOFTLOCK','T09 active player has no legal starvation action',{seed,playerId:p.playerId,turn});
        submitCard(run,p.playerId,decision.cardInstanceId,decision.skillIntent,decision.skillData);actions++;
        const rec=records.get(p.playerId);rec.skillRequested+=decision.skillIntent?1:0;rec.skillAccepted+=decision.skillIntent?1:0;
        assertRunInvariants(run);assertT09CardPartition(run,p.playerId);
      }
      for(const p of ordered.filter(x=>x.characterId==='prophet')){
        let view=projectRun(run,p.playerId);assertNoHiddenInfo(view,p.playerId);
        let decision=buildResourceStarvationDecision(view,p.playerId,{seed,contextKey});
        if(!decision)fail('SOFTLOCK','T09 Prophet has no legal starvation action',{seed,playerId:p.playerId,turn});
        const rec=records.get(p.playerId);
        if(decision.requestRevelation){
          const evt=activateImmediateCharacterSkill(run,p);actions++;
          rec.skillRequested++;rec.skillAccepted++;rec.resourceSpent++;
          rec.recoveredCardId=evt.recoveredCardId||null;
          view=projectRun(run,p.playerId);assertNoHiddenInfo(view,p.playerId);
          const repeat=attemptT09InvalidProbe(run,p.playerId,{kind:'IMMEDIATE_SKILL',expectedCode:'INSUFFICIENT_RESOURCE'},turn);
          actions++;rec.skillRequested++;rec.skillRejected++;rec.rejectReasons.push(repeat.rejectReason);
          decision=buildResourceStarvationDecision(view,p.playerId,{seed,contextKey});
        }
        submitCard(run,p.playerId,decision.cardInstanceId,false,null);actions++;
        assertRunInvariants(run);assertT09CardPartition(run,p.playerId);
      }
      run.combat._t09PendingRecords=[...records.values()];
    }else if(policy==='recovery'||policy==='steady_recovery'){
      const contextKey=`${run.currentRoomNodeId||run.combat?.monster?.id||'combat'}:turn:${turn}`;
      const intents=[];
      for(const p of run.players){
        if(p.status==='DOWNED'||run.combat.turnSubmissions[p.playerId])continue;
        const view=projectRun(run,p.playerId);assertNoHiddenInfo(view,p.playerId);
        const intent=buildRecoveryIntent(view,p.playerId);
        if(!intent)fail('BOT_NO_LEGAL_ACTION','T06 bot could not build owner recovery intent',{seed,playerId:p.playerId,turn,policy});
        intents.push(intent);
      }
      const plan=planRecoveryTurn(intents,{seed,contextKey,turn,optimized:policy==='recovery'});
      for(const action of plan.immediateActions||[]){
        const p=run.players.find(x=>x.playerId===action.playerId);
        if(!p||p.status==='DOWNED')continue;
        try{
          if(action.kind==='FATE_MANIPULATOR')activateImmediateCharacterSkill(run,p,{target_player_id:action.targetPlayerId});
          else if(action.kind==='ACROBATICS')activateImmediateCharacterSkill(run,p);
          actions++;assertRunInvariants(run);
        }catch(error){
          if(error instanceof PveSkillError&&['SKILL_NOT_READY','INSUFFICIENT_RESOURCE'].includes(error.code))continue;
          throw error;
        }
      }
      const usedNumbers=new Set();
      for(const decision of plan.decisions){
        const view=projectRun(run,decision.playerId);assertNoHiddenInfo(view,decision.playerId);
        let choices=legalCardsFromView(view,decision.playerId).sort((a,b)=>a.id.localeCompare(b.id));
        const preferred=choices.filter(card=>card.baseNumber===decision.baseNumber);
        if(preferred.length)choices=preferred;
        else{
          const nonCollision=choices.filter(card=>!usedNumbers.has(card.baseNumber));
          if(nonCollision.length)choices=nonCollision.sort((a,b)=>b.baseNumber-a.baseNumber||a.id.localeCompare(b.id));
        }
        if(!choices.length)fail('BOT_NO_LEGAL_ACTION','T06 recovery decision has no legal card after immediate effects',{seed,turn,policy,decision});
        const card=choices[seededIndex(seed,`${contextKey}:${decision.playerId}:physical:${choices.map(x=>x.id).join(',')}`,choices.length)];
        let skillIntent=decision.skillIntent;
        const owner=view.players.find(x=>x.playerId===decision.playerId);
        if(owner?.characterId==='gunner'&&!owner.publicResources?.fullBurstReady)skillIntent=false;
        if(owner?.characterId==='demon_swordsman'&&!owner.publicResources?.ghostSlashReady)skillIntent=false;
        submitCard(run,decision.playerId,card.id,skillIntent,decision.skillData);actions++;usedNumbers.add(card.baseNumber);assertRunInvariants(run);
      }
      run.combat._t06PendingPolicy=structuredClone(plan);
    }else if(policy==='burst'||policy==='steady_burst'){
      const contextKey=`${run.currentRoomNodeId||run.combat?.monster?.id||'combat'}:turn:${turn}`;
      const intents=[],views=new Map();
      for(const p of run.players){
        if(p.status==='DOWNED'||run.combat.turnSubmissions[p.playerId])continue;
        const view=projectRun(run,p.playerId);assertNoHiddenInfo(view,p.playerId);
        const intent=buildBurstIntent(view,p.playerId);
        if(!intent)fail('BOT_NO_LEGAL_ACTION','T02 bot could not build owner burst intent',{seed,playerId:p.playerId,turn,policy});
        intents.push(intent);views.set(p.playerId,view);
      }
      const plan=planBurstTurn(intents,{seed,contextKey,optimized:policy==='burst'});
      for(const decision of plan.decisions){
        const view=views.get(decision.playerId);
        const choices=legalCardsFromView(view,decision.playerId).filter(card=>card.baseNumber===decision.baseNumber).sort((a,b)=>a.id.localeCompare(b.id));
        if(!choices.length)fail('BOT_NO_LEGAL_ACTION','T02 planned card unavailable in owner projection',{seed,turn,policy,decision});
        const card=choices[seededIndex(seed,`${contextKey}:${decision.playerId}:physical:${decision.baseNumber}`,choices.length)];
        submitCard(run,decision.playerId,card.id,decision.skillIntent,decision.skillData);actions++;assertRunInvariants(run);
      }
      run.combat._t02PendingPolicy=structuredClone(plan);
    }else if(policy==='sustain'||policy==='normal_sustain'){
      const contextKey=`${run.currentRoomNodeId||run.combat?.monster?.id||'combat'}:turn:${turn}`;
      const intents=[],views=new Map();
      for(const p of run.players){
        if(p.status==='DOWNED'||run.combat.turnSubmissions[p.playerId])continue;
        const view=projectRun(run,p.playerId);assertNoHiddenInfo(view,p.playerId);
        const intent=buildSustainIntent(view,p.playerId);
        if(!intent)fail('BOT_NO_LEGAL_ACTION','T03 bot could not build owner sustain intent',{seed,playerId:p.playerId,turn,policy});
        intents.push(intent);views.set(p.playerId,view);
      }
      const plan=planSustainTurn(intents,{seed,contextKey,optimized:policy==='sustain'});
      for(const decision of plan.decisions.filter(x=>x.requestTransfusion)){
        const p=run.players.find(x=>x.playerId===decision.playerId);
        activateImmediateCharacterSkill(run,p);actions++;assertRunInvariants(run);
      }
      for(const decision of plan.decisions){
        const view=projectRun(run,decision.playerId);
        const choices=legalCardsFromView(view,decision.playerId).filter(card=>card.baseNumber===decision.baseNumber).sort((a,b)=>a.id.localeCompare(b.id));
        if(!choices.length)fail('BOT_NO_LEGAL_ACTION','T03 negotiated sustain card unavailable in owner projection',{seed,turn,policy,decision});
        const card=choices[seededIndex(seed,`${contextKey}:${decision.playerId}:physical:${decision.baseNumber}`,choices.length)];
        submitCard(run,decision.playerId,card.id,decision.skillIntent,decision.skillData);actions++;assertRunInvariants(run);
      }
      run.combat._t03PendingPolicy=structuredClone(plan);
    }else if(policy==='collision_farm'||policy==='safe_play'){
      const contextKey=`${run.currentRoomNodeId||run.combat?.monster?.id||'combat'}:turn:${turn}`;
      const intents=[],views=new Map();
      for(const p of run.players){
        if(p.status==='DOWNED'||run.combat.turnSubmissions[p.playerId])continue;
        const view=projectRun(run,p.playerId);assertNoHiddenInfo(view,p.playerId);
        const intent=buildCollisionFarmIntent(view,p.playerId);
        if(!intent)fail('BOT_NO_LEGAL_ACTION','T04 bot could not build owner intent',{seed,playerId:p.playerId,turn,policy});
        intents.push(intent);views.set(p.playerId,view);
      }
      const plan=policy==='collision_farm'
        ?planCollisionFarmTurn(intents,{seed,contextKey})
        :planCollisionSafeTurn(intents,{seed,contextKey});
      for(const decision of plan.decisions){
        const view=views.get(decision.playerId);
        const choices=legalCardsFromView(view,decision.playerId)
          .filter(card=>card.baseNumber===decision.baseNumber)
          .sort((a,b)=>a.id.localeCompare(b.id));
        if(!choices.length)fail('BOT_NO_LEGAL_ACTION','T04 negotiated card unavailable in owner projection',{seed,turn,policy,decision});
        const card=choices[seededIndex(seed,`${contextKey}:${decision.playerId}:physical:${decision.baseNumber}`,choices.length)];
        submitCard(run,decision.playerId,card.id,decision.skillIntent,decision.skillData);actions++;
        assertRunInvariants(run);
      }
      run.combat._t04PendingPolicy=structuredClone(plan);
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
    if(policy==='resource_starvation'){
      const pending=run.combat?._t09PendingRecords||[];
      for(const rec of pending){
        const player=run.players.find(p=>p.playerId===rec.playerId);
        const resolved=(result.cards||[]).find(card=>card.playerId===rec.playerId);
        const after=t09State(run,rec.playerId);
        if(player?.characterId==='mage'&&resolved?.resourceSpent){
          rec.resourceSpent+=resolved.resourceSpent;
          rec.resourceAfter=resolved.resourceAfter;
        }else{
          rec.resourceAfter=structuredClone(after.resource);
          if(player?.characterId==='warrior'&&resolved?.collisionImmune)rec.resourceSpent+=1;
        }
        if(player?.characterId==='prophet'){
          rec.resourceGained=(result.events||[]).filter(e=>e.type==='REVELATION_GAINED'&&e.playerId===rec.playerId).reduce((sum,e)=>sum+Math.max(0,(Number(e.after)||0)-(Number(e.before)||0)),0);
        }else{
          const prior=t09PriorResource.get(rec.playerId);
          if(typeof rec.resourceBefore==='number'&&typeof prior==='number')rec.resourceGained=Math.max(0,rec.resourceBefore-prior);
        }
        rec.cycleAfter=after.cycle;rec.remainingCardsAfter=after.remaining.length;
        if(player?.characterId==='gunner'){
          rec.fullBurstOutcome=resolved?.fullBurstOutcome||null;
          rec.resourceSpent+=resolved?.skillUsed==='full_burst'?1:0;
        }
        resourceTimeline.push(rec);
        t09PriorResource.set(rec.playerId,structuredClone(rec.resourceAfter));
        assertT09CardPartition(run,rec.playerId);
      }
      if(run.combat)delete run.combat._t09PendingRecords;
    }
    if(policy==='collision_farm'||policy==='safe_play'){
      const plan=run.combat?._t04PendingPolicy||null;
      collisionTurns.push(assertT04CollisionTurn(run,result,plan));
      if(run.combat)delete run.combat._t04PendingPolicy;
    }
    if(policy==='recovery'||policy==='steady_recovery'){
      const plan=run.combat?._t06PendingPolicy||null;
      recoveryTurns.push(assertRecoveryTurn(run,result,plan,fail));
      if(run.combat)delete run.combat._t06PendingPolicy;
    }
    if(policy==='burst'||policy==='steady_burst'){
      const plan=run.combat?._t02PendingPolicy||null;
      burstTurns.push(assertT02BurstTurn(run,result,plan));
      if(run.combat)delete run.combat._t02PendingPolicy;
    }
    if(policy==='sustain'||policy==='normal_sustain'){
      const plan=run.combat?._t03PendingPolicy||null;
      sustainTurns.push(assertT03SustainTurn(run,result,plan));
      if(run.combat)delete run.combat._t03PendingPolicy;
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
    numberMutationTurns,
    resourceTimeline,
    collisionTurns,
    sustainTurns,
    burstTurns,
    recoveryTurns,
    combatResourceLeakCount:run.players.reduce((sum,p)=>sum+Object.entries(PVE_RESOURCE_DEFS)
      .filter(([key,def])=>def.resetScope==='COMBAT'&&Object.hasOwn(p.publicResources||{},key))
      .length,0)
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

const T04_CHARACTER_IDS=Object.freeze(['warrior','imp','berserker','vampire']);
const T04_AUGMENTS=Object.freeze([['aug-051'],['aug-181'],['aug-131'],['aug-301']]);
const T04_BASE_BERSERKER_AUGMENTS=Object.freeze([['aug-051'],['aug-181'],[],['aug-301']]);
const T04_FIXTURE_MONSTER=Object.freeze({
  id:'t04_fixture_dummy',name:'T04 Collision Dummy',tier:'NORMAL',baseHp:999,
  pattern:[{type:'CHARGE',telegraphText:'fixture',payload:{}}]
});
function t04Run(seed,id,{augments=T04_AUGMENTS}={}){
  const run=makeCombatRun(`${seed}:${id}`,{
    caseId:`T04-${id}`,characterIds:T04_CHARACTER_IDS,augmentIdsByPlayer:augments,flame:4,monsterDef:T04_FIXTURE_MONSTER
  });
  run.combat.monster.intent={type:'CHARGE',telegraphText:'fixture',payload:{}};
  return run;
}
function t04CardId(run,pid,number){
  const view=projectRun(run,pid);assertNoHiddenInfo(view,pid);
  const cards=legalCardsFromView(view,pid).filter(card=>card.baseNumber===number).sort((a,b)=>a.id.localeCompare(b.id));
  return cards[0]?.id||null;
}
function resolveT04Fixture(run,id,{numbers,skills={},thrallId=null,hpByPlayer={},revenge=null,monsterIntent=null}){
  if(thrallId)run.players[3].publicResources.thrallPlayerId=thrallId;
  if(revenge!=null)run.players[2].publicResources.revenge=revenge;
  for(const [pid,hp] of Object.entries(hpByPlayer))run.players.find(p=>p.playerId===pid).hp=hp;
  if(monsterIntent)run.combat.monster.intent=structuredClone(monsterIntent);
  for(let i=0;i<numbers.length;i++){
    const pid=`p${i}`,cardId=t04CardId(run,pid,numbers[i]);
    if(!cardId)fail('T04_FIXTURE_CARD_MISSING',`${id} missing requested card`,{pid,number:numbers[i]});
    const skill=skills[pid]||{};
    submitCard(run,pid,cardId,Boolean(skill.enabled),skill.data??null);
  }
  const result=resolveBasicTurn(run);
  if(!result)fail('SOFTLOCK',`${id} did not resolve`);
  assertRunInvariants(run);
  const turn=assertT04CollisionTurn(run,result,{
    policy:'FIXTURE',targetNumber:null,intentionalParticipantIds:[],intentionalCollisionAttempt:false
  });
  return {
    id,
    resolvedCards:structuredClone(result.cards||[]),
    numberHistories:structuredClone(result.numberHistories||[]),
    mutationEvents:structuredClone(result.mutationEvents||[]),
    collisionGroups:structuredClone(result.collisionGroups||[]),
    combatEvents:structuredClone(result.events||[]),
    damagePackets:structuredClone(result.damagePackets||[]),
    phaseTrace:[...(result.phaseTrace||[])],
    hpAfter:Object.fromEntries(run.players.map(p=>[p.playerId,p.hp])),
    revengeAfter:Number(run.players[2].publicResources.revenge)||0,
    totalDamage:result.totalDamage,
    collisionResolutionPasses:result.collisionResolutionPasses,
    postCollisionEffectPasses:result.postCollisionEffectPasses,
    checkedTurn:turn
  };
}
function t04Card(fixture,pid){const card=fixture.resolvedCards.find(x=>x.playerId===pid);if(!card)fail('T04_FIXTURE_CARD_MISSING','fixture result card missing',{id:fixture.id,pid});return card;}
function t04Packet(fixture,pid){return fixture.damagePackets.find(x=>x.sourcePlayerId===pid&&!x.followUp)||null;}
function t04Group(fixture){return fixture.collisionGroups[0]||null;}

export function runT04Fixtures(seed){
  const fixtures=[];
  {
    const run=t04Run(seed,'F1_BERSERKER_BASE_VALID',{augments:T04_BASE_BERSERKER_AUGMENTS});
    const f=resolveT04Fixture(run,'F1_BERSERKER_BASE_VALID',{numbers:[2,3,4,5],hpByPlayer:{p2:3}});
    const packet=t04Packet(f,'p2');
    if(packet?.amount!==5||f.hpAfter.p2!==2)fail('T04_F1','Berserker base valid attack diverged',{f});
    fixtures.push(f);
  }
  {
    const run=t04Run(seed,'F2_BERSERKER_HP_FLOOR',{augments:T04_BASE_BERSERKER_AUGMENTS});
    const f=resolveT04Fixture(run,'F2_BERSERKER_HP_FLOOR',{numbers:[2,3,4,5],hpByPlayer:{p2:1}});
    if(f.hpAfter.p2!==1||t04Packet(f,'p2')?.amount!==5)fail('T04_F2','Berserker self HP floor diverged',{f});
    fixtures.push(f);
  }
  {
    const run=t04Run(seed,'F3_BERSERKER_BASE_COLLISION_HEAL',{augments:T04_BASE_BERSERKER_AUGMENTS});
    const f=resolveT04Fixture(run,'F3_BERSERKER_BASE_COLLISION_HEAL',{numbers:[4,1,4,3],hpByPlayer:{p2:1}});
    if(f.hpAfter.p2!==2||t04Group(f)?.berserkerHeal!==1||t04Card(f,'p2').valid!==false)fail('T04_F3','base collision heal diverged',{f});
    fixtures.push(f);
  }
  {
    const run=t04Run(seed,'F4_IMMORTAL_MAX_HP_HEAL');
    const f=resolveT04Fixture(run,'F4_IMMORTAL_MAX_HP_HEAL',{numbers:[4,1,4,3],hpByPlayer:{p2:2}});
    if(f.hpAfter.p2!==3||t04Group(f)?.berserkerHeal!==1)fail('T04_F4','Immortal collision heal cap diverged',{f});
    fixtures.push(f);
  }
  {
    const run=t04Run(seed,'F5_REVENGE_GAIN');
    const f=resolveT04Fixture(run,'F5_REVENGE_GAIN',{
      numbers:[4,1,4,3],hpByPlayer:{p2:2},
      monsterIntent:{type:'DIRECT_DAMAGE',telegraphText:'fixture',payload:{targetPlayerId:'p2',amount:1}}
    });
    if(f.revengeAfter!==1||f.hpAfter.p2!==2||!f.combatEvents.some(e=>e.type==='BERSERKER_REVENGE_GAINED'))fail('T04_F5','Revenge gain diverged',{f});
    fixtures.push(f);
  }
  {
    const run=t04Run(seed,'F6_REVENGE_CONSUME');
    const f=resolveT04Fixture(run,'F6_REVENGE_CONSUME',{numbers:[2,3,4,5],revenge:1});
    if(t04Packet(f,'p2')?.amount!==7||f.revengeAfter!==0||!f.combatEvents.some(e=>e.type==='BERSERKER_REVENGE_CONSUMED'))fail('T04_F6','Revenge consume diverged',{f});
    fixtures.push(f);
  }
  {
    const run=t04Run(seed,'F7_SELF_COST_NO_REVENGE');
    const f=resolveT04Fixture(run,'F7_SELF_COST_NO_REVENGE',{numbers:[2,3,4,5],revenge:0,hpByPlayer:{p2:3}});
    if(f.hpAfter.p2!==2||f.revengeAfter!==0||f.combatEvents.some(e=>e.type==='BERSERKER_REVENGE_GAINED'))fail('T04_F7','self HP cost generated Revenge',{f});
    fixtures.push(f);
  }
  {
    const run=t04Run(seed,'F8_KNIGHT_CRUSH_SINGLE');
    const f=resolveT04Fixture(run,'F8_KNIGHT_CRUSH_SINGLE',{numbers:[5,1,5,2],skills:{p0:{enabled:true}}});
    const knight=t04Card(f,'p0'),group=t04Group(f);
    if(knight.valid!==true||knight.crushedCardCount!==1||knight.crushBonusDamage!==1||group?.crushedCardCount!==1)fail('T04_F8','single crush diverged',{f});
    fixtures.push(f);
  }
  {
    const run=t04Run(seed,'F9_KNIGHT_CRUSH_MULTI');
    const f=resolveT04Fixture(run,'F9_KNIGHT_CRUSH_MULTI',{numbers:[5,1,5,5],skills:{p0:{enabled:true}}});
    const knight=t04Card(f,'p0'),group=t04Group(f);
    if(knight.crushedCardCount!==2||knight.crushBonusDamage!==2||group?.crushedCardCount!==2||new Set(group.crushedCardIds).size!==2)fail('T04_F9','multi crush diverged',{f});
    fixtures.push(f);
  }
  {
    const run=t04Run(seed,'F10_TOUGHNESS_NO_COLLISION');
    const f=resolveT04Fixture(run,'F10_TOUGHNESS_NO_COLLISION',{numbers:[5,1,4,2],skills:{p0:{enabled:true}}});
    const knight=t04Card(f,'p0');
    if((knight.crushedCardCount||0)!==0||(knight.crushBonusDamage||0)!==0||f.collisionGroups.length!==0)fail('T04_F10','Toughness without collision produced crush',{f});
    fixtures.push(f);
  }
  {
    const run=t04Run(seed,'F11_STEAL_REMOVES_COLLISION');
    const f=resolveT04Fixture(run,'F11_STEAL_REMOVES_COLLISION',{numbers:[3,3,1,5],skills:{p0:{enabled:true}}});
    const knight=t04Card(f,'p0'),berserker=t04Card(f,'p2');
    if(knight.finalNumber!==2||t04Card(f,'p1').finalNumber!==4||f.collisionGroups.length!==0||(knight.crushedCardCount||0)!==0||(berserker.berserkerCollisionHeal||0)!==0)fail('T04_F11','pre-collision steal did not remove farm collision cleanly',{f});
    fixtures.push(f);
  }
  {
    const run=t04Run(seed,'F12_SWAP_CREATES_COLLISION');
    const f=resolveT04Fixture(run,'F12_SWAP_CREATES_COLLISION',{
      numbers:[5,1,2,5],thrallId:'p2',skills:{p0:{enabled:true},p3:{enabled:true}},hpByPlayer:{p2:1}
    });
    const group=t04Group(f),knight=t04Card(f,'p0');
    if(!group||group.finalNumber!==5||!group.members.includes('p0')||!group.members.includes('p2')||knight.crushedCardCount!==1||group.berserkerHeal!==1)fail('T04_F12','Vampire swap did not create final collision reward',{f});
    fixtures.push(f);
  }
  {
    const run=t04Run(seed,'F13_FULL_MIXED');
    const f=resolveT04Fixture(run,'F13_FULL_MIXED',{
      numbers:[4,4,5,4],thrallId:'p2',skills:{p0:{enabled:true},p3:{enabled:true}},hpByPlayer:{p2:1}
    });
    const knight=t04Card(f,'p0'),berserker=t04Card(f,'p2'),group=t04Group(f);
    const phases=f.phaseTrace;
    const order=['PRE_COLLISION_SWAP','PRE_COLLISION_STEAL','FINAL_NUMBER_REVEAL','COLLISION_RESOLVE','POST_COLLISION_EFFECTS','VALIDITY_DERIVE','DAMAGE_BUILD'];
    let cursor=-1;for(const phase of order){const index=phases.indexOf(phase);if(index<=cursor)fail('T04_EVENT_ORDER','full mixed phase order diverged',{phases,phase});cursor=index;}
    if(knight.finalNumber!==3||berserker.finalNumber!==3||knight.crushedCardCount!==1||group?.berserkerHeal!==1||group?.impStolenBeforeCollision!==2||group?.vampireSwapCount!==1)fail('T04_F13','full mixed result diverged',{f});
    fixtures.push(f);
  }
  {
    const run=t04Run(seed,'F14_NO_RECURSIVE_REWARDS');
    const warrior=run.players[0],berserker=run.players[2];
    const wc=warrior.cardPool.find(card=>card.baseNumber===5),bc=berserker.cardPool.find(card=>card.baseNumber===5);
    const cards=[
      {playerId:'p0',cardInstanceId:wc.id,baseNumber:5,workingNumber:5,finalNumber:5,collisionImmune:true,valid:true},
      {playerId:'p2',cardInstanceId:bc.id,baseNumber:5,workingNumber:5,finalNumber:5,collisionImmune:false,valid:false,invalidReason:'COLLISION'}
    ];
    const groups=new Map([[5,cards]]);
    const eventId=`collision:${run.combat.id}:${run.combat.turn}:5:p0,p2`;
    const processed=new Set([eventId]),beforeHp=berserker.hp;
    let caught=null;try{resolvePostCollisionEffects(run,cards,groups,[],[],processed);}catch(error){caught=error;}
    if(caught?.code!=='COLLISION_REWARD_REENTRY'||berserker.hp!==beforeHp)fail('T04_F14','collision recursion guard failed',{code:caught?.code,beforeHp,afterHp:berserker.hp});
    fixtures.push({
      id:'F14_NO_RECURSIVE_REWARDS',collisionEventId:eventId,reentryRejected:true,
      rejectCode:caught.code,hpUnchanged:true,processedCollisionEventIds:[...processed]
    });
  }
  return {scenarioId:'T04_FIXTURES',seed,status:'PASS',fixtures};
}

function t04CollisionMetrics(turns){
  const groups=(turns||[]).flatMap(turn=>turn.collisionGroups||[]);
  const events=(turns||[]).flatMap(turn=>turn.combatEvents||[]);
  const attempts=(turns||[]).filter(turn=>turn.intentionalCollisionAttempt);
  let successfulIntentionalCollisions=0;
  for(const turn of attempts){
    const intended=new Set(turn.intentionalParticipantIds||[]);
    if((turn.collisionGroups||[]).some(group=>(group.members||[]).filter(id=>intended.has(id)).length>=2))successfulIntentionalCollisions++;
  }
  const sum=key=>groups.reduce((total,group)=>total+(Number(group[key])||0),0);
  const resourceCount=groups.reduce((total,group)=>total+(group.resourcesGenerated||[]).reduce((n,r)=>n+(Number(r.amount)||1),0),0);
  const triggered=groups.reduce((total,group)=>total+(Number(group.triggeredEffectCount)||0),0);
  return {
    collisionGroups:groups.length,
    intentionalCollisionAttempts:attempts.length,
    successfulIntentionalCollisions,
    collisionInvalidatedCards:groups.reduce((total,group)=>total+(group.invalidatedPlayers||[]).length,0),
    crushedCardCount:sum('crushedCardCount'),
    knightCrushBonusDamage:sum('knightCrushBonusDamage'),
    berserkerCollisionHeal:sum('berserkerHeal'),
    berserkerRevengeGain:events.filter(e=>e.type==='BERSERKER_REVENGE_GAINED').reduce((s,e)=>s+(Number(e.amount)||0),0),
    berserkerRevengeConsume:events.filter(e=>e.type==='BERSERKER_REVENGE_CONSUMED').reduce((s,e)=>s+(Number(e.amount)||0),0),
    impStolenAmount:(turns||[]).flatMap(turn=>turn.mutationEvents||[]).filter(e=>e.effectId==='imp-steal-summary').reduce((s,e)=>s+(Number(e.totalActuallyStolen)||0),0),
    vampireSwapCount:(turns||[]).flatMap(turn=>turn.mutationEvents||[]).filter(e=>e.phase==='PRE_COLLISION_SWAP').length,
    generatedResourceValue:resourceCount,
    triggeredEffectCount:triggered,
    avgExtraDamagePerCollision:groups.length?sum('totalImmediateDamageValue')/groups.length:0,
    avgHealingPerCollision:groups.length?sum('totalHealingValue')/groups.length:0,
    avgGeneratedResourcePerCollision:groups.length?resourceCount/groups.length:0,
    avgTriggeredEffectsPerCollision:groups.length?triggered/groups.length:0,
    recursiveCollisionTriggerCount:sum('recursiveCollisionTriggerCount')
  };
}
function t04Comparison(farm,safe){
  const farmCombat=farm.combats[0]||{},safeCombat=safe.combats[0]||{};
  const farmPartyHp=farm.players.reduce((s,p)=>s+(Number(p.hp)||0),0);
  const safePartyHp=safe.players.reduce((s,p)=>s+(Number(p.hp)||0),0);
  const farmDpt=Number(farmCombat.partyDpt)||0,safeDpt=Number(safeCombat.partyDpt)||0;
  const dptRatio=safeDpt>0?farmDpt/safeDpt:(farmDpt>0?Infinity:1);
  const survivalNotWorse=farmPartyHp>=safePartyHp&&farm.finalFlame>=safe.finalFlame;
  return {
    farmDpt,safeDpt,dptRatio,
    farmTurns:Number(farmCombat.turns)||0,safeTurns:Number(safeCombat.turns)||0,
    farmPartyHp,safePartyHp,farmFinalFlame:farm.finalFlame,safeFinalFlame:safe.finalFlame,
    survivalNotWorse,
    farmDominates:dptRatio>=1.35&&survivalNotWorse
  };
}
export function runT04(seed){
  const fixtures=runT04Fixtures(seed);
  const sharedSeed=`${seed}:compare`,common={
    seed:sharedSeed,caseId:'T04-compare',characterIds:T04_CHARACTER_IDS,augmentIdsByPlayer:T04_AUGMENTS,
    monsterDef:F1_MONSTER_DEFINITIONS.f1_armored_boar,flame:4
  };
  const farm=simulateCombat({...common,policy:'collision_farm'});
  const safe=simulateCombat({...common,policy:'safe_play'});
  const collisionMetrics=t04CollisionMetrics(farm.collisionTurns);
  const safeCollisionMetrics=t04CollisionMetrics(safe.collisionTurns);
  if(collisionMetrics.recursiveCollisionTriggerCount!==0)fail('RECURSIVE_COLLISION_TRIGGER','T04 collision rewards recursively re-entered collision processing',{seed,collisionMetrics});
  return {
    scenarioId:'T04',seed,status:'PASS',outcome:farm.outcome,actionCount:farm.actions+safe.actions,
    fixtures:fixtures.fixtures,
    collisionTurns:farm.collisionTurns,safePlayTurns:safe.collisionTurns,
    collisionMetrics,safeCollisionMetrics,comparison:t04Comparison(farm,safe),
    combats:farm.combats,effectTriggerCounts:farm.effectTriggerCounts,finalFlame:farm.finalFlame,
    safeCombats:safe.combats,safeFinalFlame:safe.finalFlame
  };
}
export function t04GoldenComparable(result){
  const historyFields=['playerId','baseNumber','selfModifiedNumber','postSwapNumber','postStealNumber','finalNumber','collisionGroup','collisionImmune','valid','damage'];
  const mutationFields=['phase','effectId','actorId','targetId','before','after','stolen','totalActuallyStolen'];
  const collisionGroupFields=['collisionEventId','finalNumber','members','invalidatedPlayers','immunePlayers','crushedCardIds','crushedCardCount','berserkerHeal','impStolenBeforeCollision','vampireSwapCount','knightCrushBonusDamage','resourcesGenerated','triggeredEffectCount','recursiveCollisionTriggerCount'];
  const eventFields=['type','phase','collisionEventId','playerId','targetId','amount','before','after','crushedCardIds','crushedCardCount','bonusDamage','damageType'];
  const packetFields=['sourcePlayerId','numberUsed','amount'];
  const relevantEvents=new Set(['THRALL_MARKED','BERSERKER_COLLISION_HEAL','KNIGHT_CRUSH_CAPTURE','BERSERKER_REVENGE_GAINED','BERSERKER_REVENGE_CONSUMED','BERSERKER_ATTACK_HP_COST','PLAYER_DAMAGED']);
  const rows=(fields,items)=>(items||[]).map(item=>fields.map(field=>item?.[field]??null));
  const eventRows=items=>rows(eventFields,(items||[]).filter(event=>relevantEvents.has(event.type)));
  const groupSummary=g=>[g.finalNumber,g.invalidatedPlayers,g.immunePlayers,g.crushedCardCount,g.berserkerHeal,g.knightCrushBonusDamage,g.recursiveCollisionTriggerCount];
  const fixtureSummary=f=>{
    if(f.id==='F14_NO_RECURSIVE_REWARDS')return [f.id,'REENTRY',f.rejectCode,f.hpUnchanged];
    return [
      f.id,f.totalDamage,f.hpAfter,f.revengeAfter,
      (f.collisionGroups||[]).map(groupSummary),
      (f.combatEvents||[]).filter(event=>relevantEvents.has(event.type)).map(event=>[event.type,event.amount??null,event.bonusDamage??null]),
      f.collisionResolutionPasses,f.postCollisionEffectPasses
    ];
  };
  const keyIds=new Set(['F5_REVENGE_GAIN','F6_REVENGE_CONSUME','F13_FULL_MIXED','F14_NO_RECURSIVE_REWARDS']);
  const keyFixture=f=>{
    if(f.id==='F14_NO_RECURSIVE_REWARDS')return semantic(f);
    return {
      id:f.id,
      histories:rows(historyFields,f.numberHistories),
      mutations:rows(mutationFields,f.mutationEvents),
      groups:rows(collisionGroupFields,f.collisionGroups),
      events:eventRows(f.combatEvents),
      packets:rows(packetFields,f.damagePackets),
      phases:f.phaseTrace||[],hp:f.hpAfter||{},revenge:f.revengeAfter??0
    };
  };
  const turnRow=turn=>[
    turn.turn,turn.policy,turn.targetNumber??null,turn.intentionalParticipantIds||[],
    rows(historyFields,turn.numberHistories),rows(mutationFields,turn.mutationEvents),
    rows(collisionGroupFields,turn.collisionGroups),eventRows(turn.combatEvents),
    rows(packetFields,turn.damagePackets),turn.hpAfter||{},turn.revengeAfter||{}
  ];
  return {
    scenarioId:result.scenarioId,status:result.status,
    historyFields,mutationFields,collisionGroupFields,eventFields,packetFields,
    fixtureSummaryFields:['id','totalDamageOrMarker','hpAfterOrRejectCode','revengeAfterOrHpUnchanged','collisionSummary','eventSummary','collisionResolutionPasses','postCollisionEffectPasses'],
    fixtureSummaries:(result.fixtures||[]).map(fixtureSummary),
    keyFixtures:(result.fixtures||[]).filter(f=>keyIds.has(f.id)).map(keyFixture),
    timelineRowFormat:['turn','policy','targetNumber','intentionalParticipantIds','histories','mutations','groups','events','packets','hpAfter','revengeAfter'],
    collisionTimeline:(result.collisionTurns||[]).map(turnRow)
  };
}

const T09_CHARACTER_IDS=Object.freeze(['warrior','mage','prophet','gunner']);
const T09_FIXTURE_MONSTER=Object.freeze({
  id:'t09_fixture_dummy',name:'T09 Resource Dummy',tier:'NORMAL',baseHp:999,
  pattern:[{type:'CHARGE',telegraphText:'fixture',payload:{}}]
});
function t09Run(seed,id){
  const run=makeCombatRun(`${seed}:${id}`,{caseId:`T09-${id}`,characterIds:T09_CHARACTER_IDS,flame:4,monsterDef:T09_FIXTURE_MONSTER});
  run.combat.monster.intent={type:'CHARGE',telegraphText:'fixture',payload:{}};
  return run;
}
function t09Card(run,pid,number){
  const view=projectRun(run,pid);assertNoHiddenInfo(view,pid);
  return cardFromView(view,pid,number)?.id||null;
}
function submitT09(run,pid,number,skillIntent=false,skillData=null){
  const id=t09Card(run,pid,number);
  if(!id)fail('T09_FIXTURE_CARD_MISSING','T09 fixture requested unavailable card',{pid,number,cycle:run.combat.privateByPlayer[pid]?.cycleIndex});
  submitCard(run,pid,id,skillIntent,skillData);
  assertRunInvariants(run);assertT09CardPartition(run,pid);
  return id;
}
function expectT09Reject(run,pid,fn,expectedCode){
  const before=t09State(run,pid);let caught=null;
  try{fn();}catch(error){caught=error;}
  if(!caught)fail('INVALID_REQUEST_ACCEPTED','T09 fixture invalid request was accepted',{pid,expectedCode});
  const code=typeof caught?.code==='string'?caught.code:'UNSTRUCTURED_REJECTION';
  if(code!==expectedCode)fail('INVALID_REJECTION_CODE','T09 fixture rejection code diverged',{pid,expectedCode,actual:code,message:caught.message});
  const after=t09State(run,pid);
  if(stableStringify(before)!==stableStringify(after))fail('REJECTED_REQUEST_MUTATED_STATE','T09 fixture rejected request mutated state',{pid,before,after});
  return {code,message:caught.message};
}
function resolveT09(run){
  const result=resolveBasicTurn(run);
  if(!result)fail('SOFTLOCK','T09 fixture did not resolve');
  assertRunInvariants(run);
  return result;
}
export function runT09Fixtures(seed){
  const cases=[];
  {
    const run=t09Run(seed,'F1_MAGE_MANA_0_ILLEGAL');run.players[1].publicResources.mana=0;
    const card=t09Card(run,'p1',1),reject=expectT09Reject(run,'p1',()=>submitCard(run,'p1',card,true,{manaSpend:2}),'INSUFFICIENT_RESOURCE');
    submitT09(run,'p0',5);submitT09(run,'p1',1);submitT09(run,'p2',4);submitT09(run,'p3',2);
    const result=resolveT09(run);
    cases.push({id:'F1_MAGE_MANA_0_ILLEGAL',reject,manaAfterReject:0,turnAdvanced:run.combat.turn===2,resultTurn:result.turn});
  }
  {
    const run=t09Run(seed,'F2_MAGE_EXACT_COST');run.players[1].publicResources.mana=2;
    submitT09(run,'p0',5);submitT09(run,'p1',1,true,{manaSpend:2});submitT09(run,'p2',4);submitT09(run,'p3',2);
    const result=resolveT09(run),mage=result.cards.find(x=>x.playerId==='p1');
    cases.push({id:'F2_MAGE_EXACT_COST',before:mage.resourceBefore,spent:mage.resourceSpent,after:mage.resourceAfter,workingNumber:mage.workingNumber});
  }
  {
    const run=t09Run(seed,'F3_KNIGHT_TOUGHNESS_0');run.players[0].publicResources.toughnessCharges=0;
    const card=t09Card(run,'p0',5),reject=expectT09Reject(run,'p0',()=>submitCard(run,'p0',card,true),'INSUFFICIENT_RESOURCE');
    submitT09(run,'p0',5);submitT09(run,'p1',1);submitT09(run,'p2',4);submitT09(run,'p3',2);
    resolveT09(run);
    cases.push({id:'F3_KNIGHT_TOUGHNESS_0',reject,toughnessAfterReject:0,turnAdvanced:run.combat.turn===2});
  }
  {
    const run=t09Run(seed,'F4_SEER_ACTIVATION_VALID_GAIN'),seer=run.players[2];seer.publicResources.revelation=1;
    submitT09(run,'p0',5);activateImmediateCharacterSkill(run,seer);
    submitT09(run,'p1',1);submitT09(run,'p2',4);submitT09(run,'p3',2);
    const result=resolveT09(run),seerCard=result.cards.find(x=>x.playerId==='p2');
    cases.push({id:'F4_SEER_ACTIVATION_VALID_GAIN',gain:seerCard.revelationGained||0,revelation:seer.publicResources.revelation,valid:seerCard.valid});
  }
  {
    const run=t09Run(seed,'F5_SEER_ACTIVATION_COLLISION_NO_GAIN'),seer=run.players[2];seer.publicResources.revelation=1;
    submitT09(run,'p1',1);activateImmediateCharacterSkill(run,seer);
    submitT09(run,'p0',5);submitT09(run,'p2',1);submitT09(run,'p3',2);
    const result=resolveT09(run),seerCard=result.cards.find(x=>x.playerId==='p2');
    cases.push({id:'F5_SEER_ACTIVATION_COLLISION_NO_GAIN',gain:seerCard.revelationGained||0,revelation:seer.publicResources.revelation,valid:seerCard.valid});
  }
  {
    const run=t09Run(seed,'F6_SEER_USE_RECOVERY'),seer=run.players[2],priv=run.combat.privateByPlayer.p2;
    const recoverId=seer.cardPool.find(x=>x.baseNumber===5).id;
    priv.remainingCardIds=priv.remainingCardIds.filter(id=>id!==recoverId);priv.spentCardIds=[recoverId];seer.publicResources.revelation=1;
    submitT09(run,'p0',2);
    const evt=activateImmediateCharacterSkill(run,seer);
    const peek=structuredClone(priv.revelationPeek);
    submitT09(run,'p1',1);submitT09(run,'p2',4);submitT09(run,'p3',3);resolveT09(run);
    cases.push({id:'F6_SEER_USE_RECOVERY',recoveredCardId:evt.recoveredCardId,expectedCardId:recoverId,revelationAfterUse:0,peek,ownershipStable:seer.cardPool.some(x=>x.id===recoverId)});
  }
  {
    const run=t09Run(seed,'F7_SEER_USE_VALID_REGAIN'),seer=run.players[2],priv=run.combat.privateByPlayer.p2;
    const recoverId=seer.cardPool.find(x=>x.baseNumber===5).id;
    priv.remainingCardIds=priv.remainingCardIds.filter(id=>id!==recoverId);priv.spentCardIds=[recoverId];seer.publicResources.revelation=1;
    submitT09(run,'p1',1);const evt=activateImmediateCharacterSkill(run,seer);
    submitT09(run,'p0',5);submitT09(run,'p2',4);submitT09(run,'p3',2);
    const result=resolveT09(run),seerCard=result.cards.find(x=>x.playerId==='p2');
    cases.push({id:'F7_SEER_USE_VALID_REGAIN',recoveredCardId:evt.recoveredCardId,spent:1,gained:seerCard.revelationGained||0,revelation:seer.publicResources.revelation});
  }
  {
    const run=t09Run(seed,'F8_SEER_NO_RECOVERY_TARGET'),seer=run.players[2],priv=run.combat.privateByPlayer.p2;
    seer.publicResources.revelation=1;
    submitT09(run,'p0',2);const evt=activateImmediateCharacterSkill(run,seer);
    submitT09(run,'p1',1);submitT09(run,'p2',4);submitT09(run,'p3',3);resolveT09(run);
    cases.push({id:'F8_SEER_NO_RECOVERY_TARGET',recoveredCardId:evt.recoveredCardId,revelationAfterUse:0,spentCountBefore:0,peekTarget:evt.targetPlayerId});
  }
  {
    const run=t09Run(seed,'F9_GUNNER_FINAL_CARD_CYCLE'),gunner=run.players[3],priv=run.combat.privateByPlayer.p3;
    const one=gunner.cardPool.find(x=>x.baseNumber===1).id,two=gunner.cardPool.find(x=>x.baseNumber===2).id,three=gunner.cardPool.find(x=>x.baseNumber===3).id;
    priv.spentCardIds=[one,two];priv.remainingCardIds=[three];gunner.publicResources.fullBurstReady=false;gunner.publicResources.burstReadyCycle=2;
    submitT09(run,'p0',5);submitT09(run,'p1',1);submitT09(run,'p2',4);submitT09(run,'p3',3);resolveT09(run);
    cases.push({id:'F9_GUNNER_FINAL_CARD_CYCLE',cycle:priv.cycleIndex,remaining:[...priv.remainingCardIds],spent:[...priv.spentCardIds],expected:[one,two,three]});
  }
  {
    const run=t09Run(seed,'F10_FULL_BURST_SUCCESS'),gunner=run.players[3],priv=run.combat.privateByPlayer.p3;
    submitT09(run,'p0',5);submitT09(run,'p1',4);submitT09(run,'p2',3);submitT09(run,'p3',1,true);
    const result=resolveT09(run),card=result.cards.find(x=>x.playerId==='p3');
    cases.push({id:'F10_FULL_BURST_SUCCESS',outcome:card.fullBurstOutcome,followUps:[...(card.followUpCardIds||[])],cycle:priv.cycleIndex,remaining:[...priv.remainingCardIds],ready:gunner.publicResources.fullBurstReady,readyCycle:gunner.publicResources.burstReadyCycle});
  }
  {
    const run=t09Run(seed,'F11_FULL_BURST_FAILURE'),gunner=run.players[3],priv=run.combat.privateByPlayer.p3;
    submitT09(run,'p0',5);submitT09(run,'p1',4);submitT09(run,'p2',1);submitT09(run,'p3',1,true);
    const result=resolveT09(run),card=result.cards.find(x=>x.playerId==='p3');
    cases.push({id:'F11_FULL_BURST_FAILURE',outcome:card.fullBurstOutcome,followUps:[...(card.followUpCardIds||[])],hp:gunner.hp,cycle:priv.cycleIndex,remaining:[...priv.remainingCardIds],spent:[...priv.spentCardIds],ready:gunner.publicResources.fullBurstReady,readyCycle:gunner.publicResources.burstReadyCycle});
  }
  {
    const run=t09Run(seed,'F12_REPEATED_INVALID'),mage=run.players[1];mage.publicResources.mana=0;
    const card=t09Card(run,'p1',1),rejectCodes=[];
    for(let i=0;i<3;i++)rejectCodes.push(expectT09Reject(run,'p1',()=>submitCard(run,'p1',card,true,{manaSpend:2}),'INSUFFICIENT_RESOURCE').code);
    submitT09(run,'p0',5);submitT09(run,'p1',1);submitT09(run,'p2',4);submitT09(run,'p3',2);resolveT09(run);
    cases.push({id:'F12_REPEATED_INVALID',rejectCodes,manaAfterRejects:0,turnAdvanced:run.combat.turn===2});
  }
  return {scenarioId:'T09_FIXTURES',seed,status:'PASS',cases};
}
function t09Metrics(timeline,combatResourceLeakCount=0){
  const reasons={};
  for(const row of timeline||[])for(const reason of row.rejectReasons||[])reasons[reason]=(reasons[reason]||0)+1;
  const prophet=(timeline||[]).filter(x=>x.classId==='prophet');
  return {
    invalidSkillRequestCount:(timeline||[]).reduce((s,x)=>s+(x.skillRejected||0),0),
    rejectedRequestCount:(timeline||[]).reduce((s,x)=>s+(x.skillRejected||0),0),
    rejectionReasonCount:reasons,
    negativeResourceOccurrence:0,
    resourceOverCapOccurrence:0,
    emptyHandSoftlockCount:0,
    cycleResetCount:(timeline||[]).filter(x=>Number(x.cycleAfter)>Number(x.cycleBefore)).length,
    recoveredCardCount:(timeline||[]).filter(x=>x.recoveredCardId).length,
    duplicateCardInvariantFailure:0,
    fullBurstSuccess:(timeline||[]).filter(x=>x.fullBurstOutcome==='SUCCESS').length,
    fullBurstFailure:(timeline||[]).filter(x=>x.fullBurstOutcome==='FAIL_COLLISION').length,
    revelationGain:prophet.reduce((s,x)=>s+(Number(x.resourceGained)||0),0),
    revelationSpend:prophet.reduce((s,x)=>s+(Number(x.resourceSpent)||0),0),
    revelationRegain:prophet.filter(x=>(Number(x.resourceSpent)||0)>0&&(Number(x.resourceGained)||0)>0).length,
    deterministicReplayMismatch:0,
    resourceLeakAtCombatEnd:combatResourceLeakCount
  };
}
export function runT09(seed){
  const fixtures=runT09Fixtures(seed);
  const stress=simulateCombat({
    seed:`${seed}:stress`,caseId:'T09-stress',characterIds:T09_CHARACTER_IDS,
    monsterDef:F1_MONSTER_DEFINITIONS.f1_armored_boar,policy:'resource_starvation',flame:4
  });
  const resourceMetrics=t09Metrics(stress.resourceTimeline,stress.combatResourceLeakCount);
  if(resourceMetrics.resourceLeakAtCombatEnd>0)fail('RESOURCE_LEAK_COMBAT_END','T09 combat-scoped resources survived COMBAT_END',{seed,count:resourceMetrics.resourceLeakAtCombatEnd});
  return {
    scenarioId:'T09',seed,status:'PASS',outcome:stress.outcome,actionCount:stress.actions,
    fixtures:fixtures.cases,resourceTimeline:stress.resourceTimeline,
    resourceMetrics,
    combats:stress.combats,finalFlame:stress.finalFlame
  };
}
export function t09GoldenComparable(result){
  const fields=[
    'turn','playerId','classId','resourceBefore','resourceGained','resourceSpent','resourceAfter',
    'skillRequested','skillAccepted','skillRejected','rejectReasons','cycleBefore','cycleAfter',
    'remainingCardsBefore','remainingCardsAfter','recoveredCardId','fullBurstOutcome'
  ];
  return {
    scenarioId:result.scenarioId,status:result.status,
    fixtures:(result.fixtures||[]).map(x=>semantic(x)),
    resourceTimeline:{
      fields,
      rows:(result.resourceTimeline||[]).map(row=>fields.map(field=>row[field]??null))
    }
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
  if(scenarioId==='T02')return runT02Scenario(seed,{simulateCombat,fail});
  if(scenarioId==='T05')return runT05(seed);
  if(scenarioId==='T06')return runT06Scenario(seed,{simulateCombat,fail});
  if(scenarioId==='T04')return runT04(seed);
  if(scenarioId==='T03')return runT03Scenario(seed,{simulateCombat,fail});
  if(scenarioId==='T09')return runT09(seed);
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
  if(result.scenarioId==='T02'){
    const m=result.burstMetrics||{},c=result.comparison||{};
    if((Number(m.maxPartyTurnDamage)||0)>=(Number(m.bossMaxHp)||Infinity)*0.5)warnings.push({code:'BURST_TOO_HIGH',maxPartyTurnDamage:m.maxPartyTurnDamage,bossMaxHp:m.bossMaxHp});
    if((Number(m.multiThresholdBurstCount)||0)>0)warnings.push({code:'MULTI_THRESHOLD_BURST',count:m.multiThresholdBurstCount});
    if((Number(m.maxConsecutiveBurstTurns)||0)>=2)warnings.push({code:'REPEATED_BURST',maxConsecutiveBurstTurns:m.maxConsecutiveBurstTurns});
    if((Number(m.maxPartyTurnDamage)||0)>=(Number(m.bossMaxHp)||Infinity)*0.5&&(Number(c.costSignals)||0)===0)warnings.push({code:'BURST_WITHOUT_COST',maxPartyTurnDamage:m.maxPartyTurnDamage,bossMaxHp:m.bossMaxHp});
    if(c.burstDominates)warnings.push({code:'BURST_DOMINATES',dptRatio:c.dptRatio,burstDpt:c.burstDpt,steadyDpt:c.steadyDpt,costLow:c.costLow});
  }
  if(result.scenarioId==='T06'){
    const m=result.recoveryMetrics||{},c=result.comparison||{};
    if((Number(m.maxTimesOneCardRecovered)||0)>=5)warnings.push({code:'SAME_CARD_RECOVERY_HIGH',maxTimesOneCardRecovered:m.maxTimesOneCardRecovered});
    if((Number(m.cardReuseRatio)||0)>=2.5)warnings.push({code:'CARD_REUSE_HIGH',cardReuseRatio:m.cardReuseRatio});
    if(c.recoveryDominates)warnings.push({code:'RECOVERY_DOMINATES',dptRatio:c.dptRatio,recoveryCardReuseRatio:c.recoveryCardReuseRatio,steadyCardReuseRatio:c.steadyCardReuseRatio,recoveryCount:c.recoveryCount});
  }
  if(result.scenarioId==='T04'&&result.comparison?.farmDominates){
    warnings.push({code:'FARM_DOMINATES',dptRatio:result.comparison.dptRatio,farmDpt:result.comparison.farmDpt,safeDpt:result.comparison.safeDpt,survivalNotWorse:true});
  }
  if(result.scenarioId==='T03'){
    const m=result.sustainMetrics||{},c=result.comparison||{};
    if((Number(m.healingRatio)||0)>=0.8&&(Number(m.mitigationRatio)||0)>=0.4&&(Number(m.flameSpent)||0)<=0.1&&(Number(c.dptRatio)||0)>=0.9){
      warnings.push({code:'SUSTAIN_TOO_HIGH',healingRatio:m.healingRatio,mitigationRatio:m.mitigationRatio,flameSpent:m.flameSpent,dptRatio:c.dptRatio});
    }
    if(c.fortressDominates)warnings.push({code:'FORTRESS_DOMINATES',dptRatio:c.dptRatio,sustainFinalPartyHp:c.sustainFinalPartyHp,normalFinalPartyHp:c.normalFinalPartyHp,sustainFlameSpent:c.sustainFlameSpent,normalFlameSpent:c.normalFlameSpent});
  }
  return warnings;
}

export function skippedScenarioReport(){
  return STRESS_SCENARIOS.map(def=>({def,availability:scenarioAvailability(def)}))
    .filter(x=>!x.availability.available)
    .map(({def,availability})=>({scenarioId:def.id,name:def.name,reasons:availability.reasons,missingCharacters:availability.missingCharacters,missingBuildEffects:availability.missingBuildEffects,missingCapabilities:availability.missingCapabilities||[]}));
}

export function t02GoldenComparable(result){return t02Golden(result);}

export function t06GoldenComparable(result){return t06Golden(result);}

export function t03GoldenComparable(result){return t03Golden(result);}

export function t14GoldenComparable(result){
  return {
    scenarioId:result.scenarioId,status:result.status,
    cases:result.cases.map(x=>({id:x.id,phase:x.phase,flame:x.flame,hp:x.hp,statuses:x.statuses,monsterHp:x.monsterHp,...(x.precedence?{precedence:x.precedence}: {})}))
  };
}
