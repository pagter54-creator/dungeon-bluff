
import {newPlayerRunState,newCombatState} from '../supabase/functions/game-api/pve/model.js';
import {beginTurn,submitCard,resolveBasicTurn} from '../supabase/functions/game-api/pve/combat.js';
import {activateImmediateCharacterSkill} from '../supabase/functions/game-api/pve/characters.js';
import {applyMonsterDamage} from '../supabase/functions/game-api/pve/monster.js';
import {projectRun} from '../supabase/functions/game-api/pve/projection.js';
import {F1_MONSTER_DEFINITIONS,F1_RELIC_DEFINITIONS} from '../supabase/functions/game-api/pve/content-f1.js';
import {installRelicCatalog} from '../supabase/functions/game-api/pve/relics.js';

export const T03_CHARACTER_IDS=Object.freeze(['warrior','vampire','berserker','mage']);
export const T03_AUGMENTS=Object.freeze([['aug-041'],['aug-321'],['aug-131'],['aug-101']]);
const FIXTURE_MONSTER=Object.freeze({id:'t03_fixture_dummy',name:'T03 Sustain Dummy',tier:'NORMAL',baseHp:999,pattern:[{type:'CHARGE',telegraphText:'fixture',payload:{}}]});

function makeFixtureRun(seed,id){
  const members=T03_CHARACTER_IDS.map((character_id,i)=>({id:'p'+i,user_id:'stress-user-'+i,member_type:'human',character_id,seat_index:i}));
  const players=members.map(newPlayerRunState);
  for(let i=0;i<players.length;i++)players[i].augments=[...T03_AUGMENTS[i]];
  const run={id:'stress-run:'+seed+':'+id,roomId:'stress-room',seed,rngCounter:0,version:0,phase:'COMBAT',floor:1,depth:1,flame:4,maxFlame:5,currentRoomNodeId:'stress-node:'+id,players,usedMonsterIds:[],chosenBossIds:{1:'f1_fallen_lord'},map:{nodes:[],edges:{}},createdAt:'stress',updatedAt:'stress'};
  installRelicCatalog(run,F1_RELIC_DEFINITIONS);
  run.combat=newCombatState(players,FIXTURE_MONSTER.baseHp,'NORMAL_COMBAT',FIXTURE_MONSTER);
  run.combat.id='stress-combat:'+seed+':'+id;
  beginTurn(run);
  run.combat.monster.intent={type:'CHARGE',telegraphText:'fixture',payload:{}};
  return run;
}
function hard(fail,code,message,details){fail(code,message,details||{});}
function viewCard(run,pid,number,fail){
  const view=projectRun(run,pid);
  if(view.combat?.turnSubmissions||view.combat?.privateByPlayer)hard(fail,'HIDDEN_INFORMATION_LEAK','T03 fixture projection leaked authoritative combat state',{pid});
  const player=view.players.find(p=>p.playerId===pid),ids=view.privateCombat?.remainingCardIds||[];
  const card=(player?.cardPool||[]).find(c=>c.baseNumber===number&&ids.includes(c.id));
  if(!card)hard(fail,'T03_FIXTURE_CARD_MISSING','T03 fixture requested unavailable card',{pid,number});
  return card;
}
function submit(run,pid,number,fail,skillIntent=false,skillData=null){const card=viewCard(run,pid,number,fail);submitCard(run,pid,card.id,skillIntent,skillData);return card.id;}
function resolve(run,fail){const result=resolveBasicTurn(run);if(!result)hard(fail,'SOFTLOCK','T03 fixture did not resolve');return result;}
const cardsById=result=>Object.fromEntries((result.cards||[]).map(c=>[c.playerId,c]));
const eventsOf=(result,type)=>(result?.events||[]).filter(e=>e.type===type);
function snapshot(id,run,result=null,extra={}){
  return {id,cards:result?Object.fromEntries((result.cards||[]).map(c=>[c.playerId,{finalNumber:c.finalNumber,valid:c.valid,invalidReason:c.invalidReason||null,guardianSacrifice:Boolean(c.guardianSacrifice),guardianRescued:Boolean(c.guardianRescued),whiteMagicHeal:Number(c.whiteMagicHeal)||0}])):{},hp:Object.fromEntries(run.players.map(p=>[p.playerId,p.hp])),blood:Number(run.players[1].publicResources.blood)||0,mana:Number(run.players[3].publicResources.mana)||0,revenge:Number(run.players[2].publicResources.revenge)||0,guardianTarget:run.players[0].publicResources.guardianTargetPlayerId||null,events:structuredClone((result?.events||[]).filter(e=>['GUARDIAN_WALL_RESCUE','DAMAGE_REDIRECTED','PLAYER_DAMAGED','PLAYER_HEALED','TRANSFUSION_USED','VAMPIRE_BLOOD_GAINED','WHITE_MAGIC_HEAL','BERSERKER_COLLISION_HEAL','BERSERKER_REVENGE_GAINED','BERSERKER_REVENGE_CONSUMED'].includes(e.type))),...extra};
}

export function runT03Fixtures(seed,fail){
  const fixtures=[];
  {
    const run=makeFixtureRun(seed,'F1');submit(run,'p0',5,fail,true);submit(run,'p1',5,fail);submit(run,'p2',2,fail);submit(run,'p3',3,fail);
    const result=resolve(run,fail),c=cardsById(result);if(c.p0.valid||!c.p0.guardianSacrifice||!c.p1.valid||!c.p1.guardianRescued)hard(fail,'GUARD_RESCUE_FAILED','Guardian Wall did not sacrifice Knight and rescue one ally',{cards:c});
    fixtures.push(snapshot('F1_GUARD_COLLISION_RESCUE',run,result));
  }
  {
    const run=makeFixtureRun(seed,'F2');submit(run,'p0',5,fail,true);submit(run,'p1',4,fail);submit(run,'p2',2,fail);submit(run,'p3',3,fail);const result=resolve(run,fail);
    if(eventsOf(result,'GUARDIAN_WALL_RESCUE').length)hard(fail,'GUARD_FALSE_TRIGGER','Guardian Wall triggered without final collision');fixtures.push(snapshot('F2_GUARD_NO_COLLISION',run,result));
  }
  {
    const run=makeFixtureRun(seed,'F3');submit(run,'p0',5,fail,true);submit(run,'p1',5,fail);submit(run,'p2',5,fail);submit(run,'p3',3,fail);const result=resolve(run,fail),c=cardsById(result);
    if([c.p1,c.p2].filter(x=>x.valid).length!==1||!c.p1.valid||c.p2.valid)hard(fail,'GUARD_MULTI_RESCUE','Guardian Wall rescued more than one or wrong ally',{cards:c});fixtures.push(snapshot('F3_GUARD_MULTI_ALLY',run,result));
  }
  {
    const run=makeFixtureRun(seed,'F4');run.players[0].publicResources.guardianTargetPlayerId='p1';const directEvents=applyMonsterDamage(run,run.players[1],1,'DIRECT',{damageEventId:'t03:F4'});
    if(run.players[0].hp!==2||run.players[1].hp!==3||directEvents.filter(e=>e.type==='DAMAGE_REDIRECTED').length!==1)hard(fail,'GUARD_REDIRECT_FAILED','Guardian redirect did not move damage exactly once',{directEvents});fixtures.push(snapshot('F4_DAMAGE_REDIRECT',run,null,{directEvents}));
  }
  {
    const run=makeFixtureRun(seed,'F5');run.players[0].publicResources.guardianTargetPlayerId='p1';const directEvents=applyMonsterDamage(run,run.players[1],1,'DIRECT',{damageEventId:'t03:F5'});let rejectCode=null;
    try{applyMonsterDamage(run,run.players[1],1,'DIRECT',{damageEventId:'t03:F5'});}catch(error){rejectCode=error.code||null;}
    if(rejectCode!=='DAMAGE_PACKET_REENTRY'||run.players[0].hp!==2||run.players[1].hp!==3)hard(fail,'DAMAGE_REENTRY_ACCEPTED','same damage packet processed twice',{rejectCode});fixtures.push(snapshot('F5_REDIRECT_ONCE',run,null,{directEvents,rejectCode}));
  }
  {
    const run=makeFixtureRun(seed,'F6');submit(run,'p0',5,fail);submit(run,'p1',4,fail);submit(run,'p2',2,fail);submit(run,'p3',3,fail);const result=resolve(run,fail);
    if(Number(run.players[1].publicResources.blood)!==1)hard(fail,'BLOOD_GAIN_FAILED','valid Vampire attack did not gain exactly one Blood');fixtures.push(snapshot('F6_VAMPIRE_BLOOD_GAIN',run,result));
  }
  {
    const run=makeFixtureRun(seed,'F7');run.players[1].publicResources.blood=3;const before=JSON.stringify({blood:run.players[1].publicResources.blood,hp:run.players.map(p=>p.hp)});let rejectCode=null;
    try{activateImmediateCharacterSkill(run,run.players[1]);}catch(error){rejectCode=error.code||null;}const after=JSON.stringify({blood:run.players[1].publicResources.blood,hp:run.players.map(p=>p.hp)});
    if(rejectCode!=='INSUFFICIENT_RESOURCE'||before!==after)hard(fail,'TRANSFUSION_BAD_REJECTION','blood<4 transfusion rejection mutated state',{rejectCode});fixtures.push(snapshot('F7_TRANSFUSION_INSUFFICIENT',run,null,{rejectCode,stateUnchanged:before===after}));
  }
  {
    const run=makeFixtureRun(seed,'F8');run.players[0].hp=2;run.players[1].publicResources.blood=4;const skillEvent=activateImmediateCharacterSkill(run,run.players[1]);
    if(run.players[0].hp!==3||run.players[1].publicResources.blood!==0||skillEvent.amount!==1)hard(fail,'TRANSFUSION_FAILED','blood4 transfusion did not heal one and spend four',{skillEvent});fixtures.push(snapshot('F8_TRANSFUSION_SUCCESS',run,null,{skillEvent}));
  }
  {
    const run=makeFixtureRun(seed,'F9');run.players[0].hp=2;run.players[2].hp=2;run.players[1].publicResources.blood=4;const skillEvent=activateImmediateCharacterSkill(run,run.players[1]);
    if(skillEvent.targetId!=='p0'||run.players[0].hp!==3||run.players[2].hp!==2)hard(fail,'TRANSFUSION_TIE_PRIORITY','Transfusion tie priority changed',{skillEvent});fixtures.push(snapshot('F9_TRANSFUSION_TIE',run,null,{skillEvent}));
  }
  {
    const run=makeFixtureRun(seed,'F10');run.players[0].hp=0;run.players[0].status='DOWNED';run.players[2].hp=1;run.players[1].publicResources.blood=4;const skillEvent=activateImmediateCharacterSkill(run,run.players[1]);
    if(skillEvent.targetId!=='p2'||run.players[0].hp!==0||run.players[0].status!=='DOWNED')hard(fail,'TRANSFUSION_RESURRECTED','basic Transfusion revived DOWNED ally',{skillEvent});fixtures.push(snapshot('F10_NO_RESURRECTION',run,null,{skillEvent}));
  }
  {
    const run=makeFixtureRun(seed,'F11');run.players[1].hp=2;run.players[3].publicResources.mana=2;submit(run,'p0',5,fail);submit(run,'p1',4,fail);submit(run,'p2',2,fail);submit(run,'p3',3,fail,true,{manaSpend:2});const result=resolve(run,fail),c=cardsById(result);
    if(c.p1.valid||c.p3.valid||run.players[1].hp!==3||eventsOf(result,'WHITE_MAGIC_HEAL').length!==1)hard(fail,'WHITE_MAGIC_FAILED','White Magic did not heal collision ally while preserving invalidity',{cards:c,events:result.events});fixtures.push(snapshot('F11_WHITE_MAGIC_SUCCESS',run,result));
  }
  {
    const run=makeFixtureRun(seed,'F12');run.players[1].hp=2;submit(run,'p0',5,fail);submit(run,'p1',4,fail);submit(run,'p2',2,fail);submit(run,'p3',4,fail);const result=resolve(run,fail);
    if(run.players[1].hp!==2||eventsOf(result,'WHITE_MAGIC_HEAL').length)hard(fail,'WHITE_MAGIC_FALSE_TRIGGER','normal collision triggered White Magic');fixtures.push(snapshot('F12_WHITE_MAGIC_NO_MANA',run,result));
  }
  {
    const run=makeFixtureRun(seed,'F13');run.players[1].hp=2;run.players[3].publicResources.mana=2;submit(run,'p0',5,fail);submit(run,'p1',3,fail);submit(run,'p2',2,fail);submit(run,'p3',3,fail,true,{manaSpend:2});const result=resolve(run,fail);
    if(eventsOf(result,'WHITE_MAGIC_HEAL').length)hard(fail,'WHITE_MAGIC_NO_COLLISION','modified Mage healed without collision');fixtures.push(snapshot('F13_WHITE_MAGIC_NO_COLLISION',run,result));
  }
  {
    const run=makeFixtureRun(seed,'F14');run.players[2].hp=2;submit(run,'p0',5,fail);submit(run,'p1',4,fail);submit(run,'p2',4,fail);submit(run,'p3',3,fail);const result=resolve(run,fail);
    if(run.players[2].hp!==3||eventsOf(result,'BERSERKER_COLLISION_HEAL').length!==1)hard(fail,'IMMORTAL_COLLISION_HEAL_FAILED','Immortal Fighter did not heal to max HP');fixtures.push(snapshot('F14_BERSERKER_COLLISION_HEAL',run,result));
  }
  {
    const run=makeFixtureRun(seed,'F15');const directEvents=applyMonsterDamage(run,run.players[2],1,'DIRECT',{damageEventId:'t03:F15'});if(run.players[2].publicResources.revenge!==1)hard(fail,'REVENGE_DIRECT_FAILED','actual DIRECT damage did not grant Revenge',{directEvents});fixtures.push(snapshot('F15_REVENGE_DIRECT',run,null,{directEvents}));
  }
  {
    const run=makeFixtureRun(seed,'F16');run.players[2].publicResources.armor=1;const directEvents=applyMonsterDamage(run,run.players[2],1,'DIRECT',{damageEventId:'t03:F16'});
    if(run.players[2].hp!==3||run.players[2].publicResources.revenge!==0)hard(fail,'ZERO_DAMAGE_REVENGE','fully prevented DIRECT granted Revenge',{directEvents});fixtures.push(snapshot('F16_ZERO_DAMAGE_NO_REVENGE',run,null,{directEvents}));
  }
  {
    const run=makeFixtureRun(seed,'F17');run.players[0].hp=2;run.players[0].publicResources.guardianTargetPlayerId='p2';run.players[1].publicResources.blood=4;const directEvents=applyMonsterDamage(run,run.players[2],1,'DIRECT',{damageEventId:'t03:F17'});const skillEvent=activateImmediateCharacterSkill(run,run.players[1]);
    if(run.players[0].hp!==2||skillEvent.targetId!=='p0'||directEvents.filter(e=>e.type==='DAMAGE_REDIRECTED').length!==1)hard(fail,'GUARD_TRANSFUSION_CHAIN','Guard then Transfusion chain diverged',{directEvents,skillEvent});fixtures.push(snapshot('F17_GUARD_TRANSFUSION',run,null,{directEvents,skillEvent}));
  }
  {
    const run=makeFixtureRun(seed,'F18');run.players[0].hp=2;run.players[3].publicResources.mana=2;submit(run,'p0',5,fail,true);submit(run,'p1',5,fail);submit(run,'p2',2,fail);submit(run,'p3',4,fail,true,{manaSpend:2});const result=resolve(run,fail),c=cardsById(result);
    if(!c.p1.valid||run.players[0].hp!==3||eventsOf(result,'WHITE_MAGIC_HEAL').length!==1)hard(fail,'GUARD_WHITE_MAGIC_CHAIN','Guard rescue and White Magic did not coexist once',{cards:c,events:result.events});fixtures.push(snapshot('F18_GUARD_WHITE_MAGIC',run,result));
  }
  {
    const run=makeFixtureRun(seed,'F19');run.players[0].hp=2;run.players[1].publicResources.blood=3;run.players[3].publicResources.mana=2;submit(run,'p0',5,fail,true);submit(run,'p1',5,fail);submit(run,'p2',2,fail);submit(run,'p3',4,fail,true,{manaSpend:2});const result=resolve(run,fail);
    const redirectEvents=applyMonsterDamage(run,run.players[1],1,'DIRECT',{damageEventId:'t03:F19:guard'}),revengeEvents=applyMonsterDamage(run,run.players[2],1,'DIRECT',{damageEventId:'t03:F19:berserker'}),skillEvent=activateImmediateCharacterSkill(run,run.players[1]);
    const all=[...(result.events||[]),...redirectEvents,...revengeEvents,skillEvent];for(const type of ['GUARDIAN_WALL_RESCUE','WHITE_MAGIC_HEAL','VAMPIRE_BLOOD_GAINED'])if(!all.some(e=>e.type===type))hard(fail,'FULL_SUSTAIN_CHAIN_MISSING','full chain missed '+type,{all});
    if(!redirectEvents.some(e=>e.type==='DAMAGE_REDIRECTED')||!revengeEvents.some(e=>e.type==='BERSERKER_REVENGE_GAINED')||skillEvent.type!=='TRANSFUSION_USED')hard(fail,'FULL_SUSTAIN_CHAIN_MISSING','full chain missed redirect revenge or transfusion',{all});
    fixtures.push(snapshot('F19_FULL_SUSTAIN_CHAIN',run,result,{directEvents:[...redirectEvents,...revengeEvents],skillEvent}));
  }
  {
    const run=makeFixtureRun(seed,'F20');run.players[0].hp=2;run.players[0].publicResources.guardianTargetPlayerId='p2';run.players[1].publicResources.blood=4;const directEvents=applyMonsterDamage(run,run.players[2],1,'DIRECT',{damageEventId:'t03:F20'});const skillEvent=activateImmediateCharacterSkill(run,run.players[1]);
    const redirectCount=directEvents.filter(e=>e.type==='DAMAGE_REDIRECTED').length,healCount=(run.combat.pendingSkillEvents||[]).filter(e=>e.type==='PLAYER_HEALED').length;
    if(redirectCount!==1||healCount!==1)hard(fail,'SUSTAIN_RECURSION','sustain trigger recursively re-entered',{redirectCount,healCount,directEvents});fixtures.push(snapshot('F20_NO_SUSTAIN_RECURSION',run,null,{directEvents,skillEvent,redirectCount,healCount}));
  }
  return fixtures;
}

function summarizeRuns(runs){
  const turns=runs.flatMap(r=>r.sustainTurns||[]),combats=runs.flatMap(r=>r.combats||[]),sum=field=>turns.reduce((n,row)=>n+(Number(row[field])||0),0);
  const actualDamage=sum('actualDamage'),rawIncomingDamage=sum('rawIncomingDamage'),healing=sum('healing'),preventedDamage=sum('preventedDamage');
  const partyDamage=combats.reduce((n,c)=>n+(Number(c.partyDamage)||0),0),turnCount=combats.reduce((n,c)=>n+(Number(c.turns)||0),0);
  return {rawIncomingDamage,redirectedDamage:sum('redirectedDamage'),preventedDamage,actualDamage,healing,wastedHeal:sum('wastedHeal'),healEvents:sum('healEvents'),protectionEvents:sum('protectionEvents'),redirectEvents:sum('redirectEvents'),revengeGains:sum('revengeGains'),collisionHeals:sum('collisionHeals'),transfusions:sum('transfusions'),whiteMagicHeals:sum('whiteMagicHeals'),hp1Rescues:sum('hp1Rescues'),pendingDownSaved:sum('pendingDownSaved'),recursiveHealCount:sum('recursiveHealCount'),recursiveRedirectCount:sum('recursiveRedirectCount'),healingRatio:healing/Math.max(1,actualDamage),mitigationRatio:preventedDamage/Math.max(1,rawIncomingDamage),effectiveSustainValue:healing+preventedDamage,flameSpent:combats.reduce((n,c)=>n+(Number(c.flameSpent)||0),0),ko:combats.reduce((n,c)=>n+(Number(c.ko)||0),0),finalPartyHp:runs.reduce((n,r)=>n+r.players.reduce((m,p)=>m+(Number(p.hp)||0),0),0)/Math.max(1,runs.length),partyDpt:partyDamage/Math.max(1,turnCount),turnCount};
}

export function runT03Scenario(seed,{simulateCombat,fail}){
  const fixtures=runT03Fixtures(seed,fail),encounters=[['normal',F1_MONSTER_DEFINITIONS.f1_armored_boar],['elite',F1_MONSTER_DEFINITIONS.f1_echo_bat],['boss',F1_MONSTER_DEFINITIONS.f1_fallen_lord]];
  const optimized=encounters.map(([caseId,monsterDef])=>simulateCombat({seed:seed+':'+caseId,caseId:'T03-compare-'+caseId,characterIds:T03_CHARACTER_IDS,augmentIdsByPlayer:T03_AUGMENTS,monsterDef,policy:'sustain',flame:4}));
  const normal=encounters.map(([caseId,monsterDef])=>simulateCombat({seed:seed+':'+caseId,caseId:'T03-compare-'+caseId,characterIds:T03_CHARACTER_IDS,augmentIdsByPlayer:T03_AUGMENTS,monsterDef,policy:'normal_sustain',flame:4}));
  const sustainMetrics=summarizeRuns(optimized),normalSustainMetrics=summarizeRuns(normal);
  if(sustainMetrics.recursiveHealCount||sustainMetrics.recursiveRedirectCount)hard(fail,'SUSTAIN_RECURSION','recursive sustain trigger detected',{sustainMetrics});
  const dptRatio=sustainMetrics.partyDpt/Math.max(0.0001,normalSustainMetrics.partyDpt),survivalBetter=sustainMetrics.ko<normalSustainMetrics.ko||sustainMetrics.finalPartyHp>normalSustainMetrics.finalPartyHp,flameLower=sustainMetrics.flameSpent<normalSustainMetrics.flameSpent;
  const comparison={sustainDpt:sustainMetrics.partyDpt,normalDpt:normalSustainMetrics.partyDpt,dptRatio,sustainTurns:sustainMetrics.turnCount,normalTurns:normalSustainMetrics.turnCount,sustainFinalPartyHp:sustainMetrics.finalPartyHp,normalFinalPartyHp:normalSustainMetrics.finalPartyHp,sustainFlameSpent:sustainMetrics.flameSpent,normalFlameSpent:normalSustainMetrics.flameSpent,sustainKo:sustainMetrics.ko,normalKo:normalSustainMetrics.ko,survivalBetter,flameLower,fortressDominates:survivalBetter&&flameLower&&dptRatio>=0.9};
  return {scenarioId:'T03',seed,status:'PASS',outcome:optimized.some(x=>x.outcome==='RUN_FAILED')?'RUN_FAILED':'COMPLETED',actionCount:optimized.reduce((n,r)=>n+r.actions,0)+normal.reduce((n,r)=>n+r.actions,0),fixtures,combats:optimized.flatMap(x=>x.combats||[]),sustainTurns:optimized.flatMap(x=>x.sustainTurns||[]),normalSustainTurns:normal.flatMap(x=>x.sustainTurns||[]),sustainMetrics,normalSustainMetrics,comparison,finalFlame:optimized.at(-1)?.finalFlame??null};
}

export function t03GoldenComparable(result){
  const eventFields=['type','phase','damageEventId','healEventId','collisionEventId','playerId','targetId','originalTarget','redirectedTarget','redirectSource','rawDamage','preventedDamage','amount','before','after','bloodBefore','bloodSpent','bloodAfter'];
  const compact=items=>(items||[]).map(e=>eventFields.map(k=>e?.[k]??null));
  return {scenarioId:result.scenarioId,status:result.status,eventFields,fixtures:(result.fixtures||[]).map(f=>({id:f.id,cards:f.cards,hp:f.hp,blood:f.blood,mana:f.mana,revenge:f.revenge,guardianTarget:f.guardianTarget,events:compact(f.events),directEvents:compact(f.directEvents),rejectCode:f.rejectCode??null,skillEvent:f.skillEvent?eventFields.map(k=>f.skillEvent?.[k]??null):null,redirectCount:f.redirectCount??null,healCount:f.healCount??null}))};
}
