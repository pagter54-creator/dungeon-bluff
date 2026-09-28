import {newPlayerRunState,newCombatState} from '../supabase/functions/game-api/pve/model.js';
import {beginTurn,submitCard,resolveBasicTurn} from '../supabase/functions/game-api/pve/combat.js';
import {activateImmediateCharacterSkill,PveSkillError} from '../supabase/functions/game-api/pve/characters.js';
import {projectRun} from '../supabase/functions/game-api/pve/projection.js';
import {F1_RELIC_DEFINITIONS} from '../supabase/functions/game-api/pve/content-f1.js';
import {STRESS_REFERENCE_MONSTERS as F1_MONSTER_DEFINITIONS} from './pve-stress-reference-monsters.mjs';
import {installRelicCatalog} from '../supabase/functions/game-api/pve/relics.js';

export const T06_CHARACTER_IDS=Object.freeze(['prophet','gunner','twins','demon_swordsman']);
export const T06_AUGMENTS=Object.freeze([['aug-161'],['aug-241'],['aug-381'],['aug-331']]);
export const RECOVERY_CHAIN_DEPTH_LIMIT=4;
export const DERIVED_EVENTS_PER_ROOT_LIMIT=24;
const DUMMY=Object.freeze({id:'t06_fixture_dummy',name:'T06 Recovery Dummy',tier:'NORMAL',baseHp:999,pattern:[{type:'CHARGE',telegraphText:'fixture',payload:{}}]});

const hard=(fail,code,message,details={})=>fail(code,message,details);
function makeRun(seed,id,{monsterDef=DUMMY}={}){
  const members=T06_CHARACTER_IDS.map((character_id,i)=>({id:'p'+i,user_id:'stress-user-'+i,member_type:'human',character_id,seat_index:i}));
  const players=members.map(newPlayerRunState);
  for(let i=0;i<players.length;i++)players[i].augments=[...T06_AUGMENTS[i]];
  const run={id:'stress-run:'+seed+':'+id,roomId:'stress-room',seed,rngCounter:0,version:0,phase:'COMBAT',floor:1,depth:1,flame:4,maxFlame:5,currentRoomNodeId:'stress-node:'+id,players,usedMonsterIds:[],chosenBossIds:{1:'f1_fallen_lord'},map:{nodes:[],edges:{}},createdAt:'stress',updatedAt:'stress'};
  installRelicCatalog(run,F1_RELIC_DEFINITIONS);
  const roomType=monsterDef.tier==='BOSS'?'BOSS':monsterDef.tier==='ELITE'?'ELITE_COMBAT':'NORMAL_COMBAT';
  run.combat=newCombatState(players,monsterDef.baseHp,roomType,monsterDef);run.combat.id='stress-combat:'+seed+':'+id;beginTurn(run);
  run.combat.monster.intent={type:'CHARGE',telegraphText:'fixture',payload:{}};
  run.players[2].publicResources.parity=1;
  return run;
}
function partition(run,pid){
  const p=run.players.find(x=>x.playerId===pid),priv=run.combat?.privateByPlayer?.[pid];
  const pool=(p?.cardPool||[]).map(c=>c.id),remaining=[...(priv?.remainingCardIds||[])],spent=[...(priv?.spentCardIds||[])];
  return {pool,remaining,spent,cycle:priv?.cycleIndex||null};
}
function assertPartition(run,pid,fail){
  const z=partition(run,pid),pool=new Set(z.pool),r=new Set(z.remaining),s=new Set(z.spent);
  if(r.size!==z.remaining.length||s.size!==z.spent.length)hard(fail,'DUPLICATE_PHYSICAL_CARD','duplicate card inside a zone',{pid,z});
  for(const id of r)if(s.has(id))hard(fail,'INVALID_CARD_ZONE_PARTITION','card exists in remaining and spent',{pid,id,z});
  const union=new Set([...r,...s]);
  if(union.size!==pool.size||[...pool].some(id=>!union.has(id))||[...union].some(id=>!pool.has(id)))hard(fail,'INVALID_CARD_ZONE_PARTITION','remaining + spent is not exact current physical pool',{pid,z});
  return z;
}
function moveToSpent(run,pid,cardId){
  const priv=run.combat.privateByPlayer[pid];
  priv.remainingCardIds=priv.remainingCardIds.filter(id=>id!==cardId);
  if(!priv.spentCardIds.includes(cardId))priv.spentCardIds.push(cardId);
}
function ownCard(run,pid,number,fail){
  const view=projectRun(run,pid),p=view.players.find(x=>x.playerId===pid),ids=view.privateCombat?.remainingCardIds||[];
  const card=(p?.cardPool||[]).find(c=>c.baseNumber===number&&ids.includes(c.id)&&(p.characterId!=='twins'||c.baseNumber%2===(p.publicResources?.parity||0)));
  if(!card)hard(fail,'T06_FIXTURE_CARD_MISSING','requested fixture card unavailable',{pid,number,remaining:ids,parity:p?.publicResources?.parity});
  return card.id;
}
function submit(run,pid,number,fail,skill=false){const id=ownCard(run,pid,number,fail);submitCard(run,pid,id,skill,null);return id;}
function resolve(run,fail){const r=resolveBasicTurn(run);if(!r)hard(fail,'SOFTLOCK','T06 fixture did not resolve');return r;}
function uniqueTurn(run,fail,{p0=1,p1=2,p2=3,p3=4,skills={}}={}){
  submit(run,'p0',p0,fail,Boolean(skills.p0));submit(run,'p1',p1,fail,Boolean(skills.p1));submit(run,'p2',p2,fail,Boolean(skills.p2));submit(run,'p3',p3,fail,Boolean(skills.p3));return resolve(run,fail);
}
function expectCode(fn,code,fail){
  let got=null;try{fn();}catch(error){got=error.code||error.message;}
  if(got!==code)hard(fail,'EXPECTED_REJECTION_MISSING','expected rejection did not occur',{expected:code,got});return got;
}
function pendingEvents(run){return [...(run.combat?.pendingSkillEvents||[])];}
function eventOf(events,type){return (events||[]).filter(e=>e.type===type);}
function snapshot(id,run,result=null,extra={}){
  return {id,phase:run.phase,zones:Object.fromEntries(run.players.map(p=>[p.playerId,partition(run,p.playerId)])),resources:Object.fromEntries(run.players.map(p=>[p.playerId,{revelation:p.publicResources.revelation??null,fullBurstReady:p.publicResources.fullBurstReady??null,acrobaticsReady:p.publicResources.acrobaticsReady??null,acrobaticsRechargeProgress:p.publicResources.acrobaticsRechargeProgress??null,acrobaticsBoostReady:p.publicResources.acrobaticsBoostReady??null,parity:p.publicResources.parity??null,devour:p.publicResources.devour??null,ghostSlashLevel:p.publicResources.ghostSlashLevel??null,ghostSlashReady:p.publicResources.ghostSlashReady??null}])),result:result?{turn:result.turn,totalDamage:result.totalDamage,cards:structuredClone(result.cards),packets:structuredClone(result.damagePackets),events:structuredClone(result.events)}:null,...extra};
}
function enforceChain(events){
  const byRoot=new Map();let maxDepth=0;
  for(const e of events||[]){
    const depth=Number(e.chainDepth)||0;maxDepth=Math.max(maxDepth,depth);
    if(depth>RECOVERY_CHAIN_DEPTH_LIMIT){const error=new Error('recovery chain depth exceeded');error.code='RECOVERY_CHAIN_DEPTH_EXCEEDED';throw error;}
    if(!e.rootActionId)continue;byRoot.set(e.rootActionId,(byRoot.get(e.rootActionId)||0)+1);
  }
  const maxDerived=Math.max(0,...byRoot.values());
  if(maxDerived>DERIVED_EVENTS_PER_ROOT_LIMIT){const error=new Error('derived event ceiling exceeded');error.code='ACTION_CHAIN_CEILING_EXCEEDED';throw error;}
  return {maxDepth,maxDerived};
}
export function assertRecoveryTurn(run,result,policyPlan,fail){
  for(const p of run.players)assertPartition(run,p.playerId,fail);
  const events=result.events||[],recoveries=eventOf(events,'CARD_RECOVERED'),resets=eventOf(events,'CYCLE_RESET'),reactivations=eventOf(events,'GHOST_SLASH_REACTIVATED');
  for(const e of recoveries){
    if(e.fromZone!=='SPENT'||e.toZone!=='REMAINING'||!e.cardInstanceId||!e.rootActionId||!e.recoveryChainId)hard(fail,'INVALID_RECOVERY_EVENT','recovery telemetry incomplete',{e});
    const owner=run.players.find(p=>p.playerId===e.targetPlayerId);
    if(!owner?.cardPool.some(c=>c.id===e.cardInstanceId))hard(fail,'CARD_OWNERSHIP_CHANGED','recovered card is not owned by target',{e});
  }
  const uses=[...(result.cards||[]).map(c=>c.cardInstanceId),...(result.damagePackets||[]).filter(p=>p.followUp).map(p=>p.sourceCardId)];
  const derived=[...events.filter(e=>['CARD_RECOVERED','CYCLE_RESET','GHOST_SLASH_REACTIVATED','GHOST_SLASH_LEVEL_UP','FATE_MANIPULATOR_USED','ACROBATICS_USED'].includes(e.type))];
  let chain;try{chain=enforceChain(derived);}catch(error){hard(fail,error.code||'ACTION_CHAIN_CEILING_EXCEEDED',error.message,{events:derived});}
  const recoveredRoots=new Set(recoveries.map(e=>e.rootActionId));
  if((result.damagePackets||[]).some(p=>recoveredRoots.has(p.rootActionId)))hard(fail,'RECOVERY_AUTO_USE','card recovery generated damage in the same recovery root action',{recoveries,packets:result.damagePackets});
  const slashUses=eventOf(events,'GHOST_SLASH_USED'),reactRoots=new Set(reactivations.map(e=>e.rootActionId));
  if(slashUses.length>1&&reactivations.length)hard(fail,'GHOST_REACTIVATION_RECURSION','Ghost Slash auto-cast/re-entry detected',{slashUses,reactivations});
  return {
    combatId:run.combat?.id||null,turn:result.turn,policy:policyPlan?.policy||null,
    recoveries:structuredClone(recoveries),cycleResets:structuredClone(resets),reactivations:structuredClone(reactivations),
    parityEvents:structuredClone(eventOf(events,'TWINS_PARITY_FLIPPED')),
    acrobaticsEvents:structuredClone(events.filter(e=>['ACROBATICS_USED','ACROBATICS_RECHARGE_PROGRESS','ACROBATICS_RECHARGED','AERIAL_ACROBATICS_BONUS_CONSUMED'].includes(e.type))),
    ghostEvents:structuredClone(events.filter(e=>['GHOST_SLASH_USED','GHOST_SLASH_LEVEL_UP','GHOST_SLASH_REACTIVATED','DEVOUR_GAINED'].includes(e.type))),
    physicalCardUses:uses,uniquePhysicalCardUses:[...new Set(uses)],
    rootPlayerActions:(result.cards||[]).length,followUpCardUses:(result.damagePackets||[]).filter(p=>p.followUp).length,
    automaticEvents:derived.length,totalDerivedEventsPerRootAction:chain.maxDerived,maxRecoveryChainDepth:chain.maxDepth,
    actionCeilingHits:0,recursiveRecoveryAttempts:0,recursiveCycleResetAttempts:0,recursiveSkillReactivationAttempts:0,
    fullBurstCycleResets:resets.filter(e=>e.resetReason==='FULL_BURST').length,
    acrobaticsCycleResets:resets.filter(e=>e.resetReason==='ACROBATICS').length,
    skillCasts:(result.cards||[]).filter(c=>c.skillUsed).length+eventOf(events,'FATE_MANIPULATOR_USED').length+eventOf(events,'ACROBATICS_USED').length,
    zones:Object.fromEntries(run.players.map(p=>[p.playerId,partition(run,p.playerId)]))
  };
}

export function runT06Fixtures(seed,fail){
  const rows=[];
  {
    const run=makeRun(seed,'F1'),cardId=run.players[1].cardPool[0].id;moveToSpent(run,'p1',cardId);run.players[0].publicResources.revelation=1;
    const used=activateImmediateCharacterSkill(run,run.players[0],{target_player_id:'p1'}),recovery=eventOf(pendingEvents(run),'CARD_RECOVERED')[0];
    if(recovery?.cardInstanceId!==cardId||partition(run,'p1').spent.includes(cardId)||!partition(run,'p1').remaining.includes(cardId))hard(fail,'FATE_RECOVERY_FAILED','ally card did not move spent -> remaining',{used,recovery});
    rows.push(snapshot('F1_SEER_ALLY_RECOVERY',run,null,{used,recovery,cardId}));
  }
  {
    const run=makeRun(seed,'F2'),cardId=run.players[1].cardPool[0].id;moveToSpent(run,'p1',cardId);run.players[0].publicResources.revelation=1;activateImmediateCharacterSkill(run,run.players[0],{target_player_id:'p1'});
    const z=assertPartition(run,'p1',fail);rows.push(snapshot('F2_NO_CARD_DUPLICATION',run,null,{zoneCardCount:z.remaining.length+z.spent.length}));
  }
  {
    const run=makeRun(seed,'F3'),cardId=run.players[1].cardPool[0].id;moveToSpent(run,'p1',cardId);run.players[0].publicResources.revelation=1;const hp=run.combat.monster.hp;
    activateImmediateCharacterSkill(run,run.players[0],{target_player_id:'p1'});
    if(Object.keys(run.combat.turnSubmissions).length||run.combat.monster.hp!==hp)hard(fail,'RECOVERY_AUTO_USE','recovery created submission or damage');
    rows.push(snapshot('F3_RECOVERY_NO_AUTO_USE',run,null,{monsterHpBefore:hp,monsterHpAfter:run.combat.monster.hp}));
  }
  {
    const run=makeRun(seed,'F4'),cardId=run.players[1].cardPool[0].id;moveToSpent(run,'p1',cardId);run.players[0].publicResources.revelation=1;activateImmediateCharacterSkill(run,run.players[0],{target_player_id:'p1'});
    const result=uniqueTurn(run,fail,{p0:2,p1:1,p2:3,p3:4});
    if(!partition(run,'p1').spent.includes(cardId))hard(fail,'RECOVERED_CARD_NOT_SPENT','recovered card did not return to spent after normal use',{cardId});
    rows.push(snapshot('F4_RECOVERED_CARD_NORMAL_REUSE',run,result,{cardId}));
  }
  {
    const run=makeRun(seed,'F5'),cardId=run.players[1].cardPool[0].id;moveToSpent(run,'p1',cardId);run.players[0].publicResources.revelation=1;activateImmediateCharacterSkill(run,run.players[0],{target_player_id:'p1'});
    uniqueTurn(run,fail,{p0:2,p1:1,p2:3,p3:4});run.players[0].publicResources.revelation=1;
    const second=activateImmediateCharacterSkill(run,run.players[0],{target_player_id:'p1'}),recovery=eventOf(pendingEvents(run),'CARD_RECOVERED').at(-1);
    if(recovery?.cardInstanceId!==cardId)hard(fail,'SAME_CARD_SECOND_RECOVERY_FAILED','same physical card was not recoverable on a later action',{second,recovery,cardId});
    rows.push(snapshot('F5_SAME_CARD_SECOND_RECOVERY',run,null,{cardId,second,recovery}));
  }
  {
    const run=makeRun(seed,'F6');const result=uniqueTurn(run,fail,{p0:4,p1:1,p2:3,p3:2,skills:{p1:true}});
    const reset=eventOf(result.events,'CYCLE_RESET').find(e=>e.playerId==='p1'&&e.resetReason==='FULL_BURST');
    if(!reset||(result.damagePackets||[]).filter(p=>p.sourcePlayerId==='p1').length!==4||partition(run,'p1').cycle!==2)hard(fail,'FULL_BURST_RESET_FAILED','T02 Full Burst reset invariant changed',{reset});
    rows.push(snapshot('F6_FULL_BURST_RESET',run,result));
  }
  {
    const run=makeRun(seed,'F7');uniqueTurn(run,fail,{p0:4,p1:1,p2:3,p3:2,skills:{p1:true}});run.players[0].publicResources.revelation=1;
    const before=JSON.stringify(partition(run,'p1')),code=expectCode(()=>activateImmediateCharacterSkill(run,run.players[0],{target_player_id:'p1'}),'SKILL_NOT_READY',fail),after=JSON.stringify(partition(run,'p1'));
    if(before!==after)hard(fail,'PREVIOUS_CYCLE_RECOVERY_MUTATED','rejected previous-cycle recovery changed new magazine',{before,after});
    rows.push(snapshot('F7_FULL_BURST_THEN_RECOVERY_BOUNDARY',run,null,{code,stateUnchanged:before===after}));
  }
  {
    const run=makeRun(seed,'F8'),cardId=run.players[1].cardPool[0].id;moveToSpent(run,'p1',cardId);run.players[0].publicResources.revelation=1;activateImmediateCharacterSkill(run,run.players[0],{target_player_id:'p1'});
    const result=uniqueTurn(run,fail,{p0:5,p1:2,p2:3,p3:1,skills:{p1:true}}),gunPackets=result.damagePackets.filter(p=>p.sourcePlayerId==='p1');
    if(gunPackets.filter(p=>p.sourceCardId===cardId).length!==1||gunPackets.length!==4)hard(fail,'RECOVERY_FULL_BURST_DUPLICATE','recovered gunner card inserted incorrectly into Full Burst',{gunPackets,cardId});
    rows.push(snapshot('F8_RECOVERY_FULL_BURST_BOUNDARY',run,result,{cardId}));
  }
  {
    const run=makeRun(seed,'F9');const result=uniqueTurn(run,fail,{p0:4,p1:1,p2:3,p3:2,skills:{p1:true}}),gunPackets=result.damagePackets.filter(p=>p.sourcePlayerId==='p1');
    if(gunPackets.length!==4||new Set(gunPackets.map(p=>p.sourceCardId)).size!==4||partition(run,'p1').cycle!==2)hard(fail,'NEW_CYCLE_IN_OLD_BURST','new-cycle card leaked into old Full Burst',{gunPackets});
    rows.push(snapshot('F9_NEW_CYCLE_EXCLUDED_FROM_OLD_BURST',run,result));
  }
  {
    const run=makeRun(seed,'F10');run.players[2].publicResources.parity=1;const bad=run.players[2].cardPool.find(c=>c.baseNumber%2===0).id,before=JSON.stringify(partition(run,'p2'));let rejected=false;
    try{submitCard(run,'p2',bad,false,null);}catch{rejected=true;}
    if(!rejected||before!==JSON.stringify(partition(run,'p2')))hard(fail,'TWINS_PARITY_REJECTION_MUTATED','illegal parity submit was accepted or mutated state');
    rows.push(snapshot('F10_TWINS_BASE_PARITY',run,null,{rejected}));
  }
  {
    const run=makeRun(seed,'F11'),id=run.players[2].cardPool[0].id;moveToSpent(run,'p2',id);run.players[2].publicResources.parity=1;const before=partition(run,'p2');
    const used=activateImmediateCharacterSkill(run,run.players[2]),after=partition(run,'p2'),reset=eventOf(pendingEvents(run),'CYCLE_RESET')[0];
    if(after.cycle!==before.cycle+1||after.spent.length||after.remaining.length!==4||run.players[2].publicResources.parity!==0||run.players[2].publicResources.acrobaticsReady!==false||!reset)hard(fail,'ACROBATICS_RESET_FAILED','Acrobatics did not reset exactly once',{before,after,used,reset});
    rows.push(snapshot('F11_TWINS_ACROBATICS_RESET',run,null,{used,reset}));
  }
  {
    const run=makeRun(seed,'F12'),id=run.players[2].cardPool[0].id;moveToSpent(run,'p2',id);activateImmediateCharacterSkill(run,run.players[2]);const z=assertPartition(run,'p2',fail);
    rows.push(snapshot('F12_ACROBATICS_NO_DUPLICATION',run,null,{zoneCardCount:z.remaining.length+z.spent.length}));
  }
  {
    const run=makeRun(seed,'F13');activateImmediateCharacterSkill(run,run.players[2]);const before=JSON.stringify(partition(run,'p2')),code=expectCode(()=>activateImmediateCharacterSkill(run,run.players[2]),'SKILL_NOT_READY',fail);
    if(before!==JSON.stringify(partition(run,'p2')))hard(fail,'ACROBATICS_REJECT_MUTATED','rejected Acrobatics mutated cycle');
    rows.push(snapshot('F13_ACROBATICS_RECHARGE_REJECTION',run,null,{code}));
  }
  {
    const run=makeRun(seed,'F14'),id=run.players[2].cardPool[0].id;moveToSpent(run,'p2',id);run.players[0].publicResources.revelation=1;activateImmediateCharacterSkill(run,run.players[0],{target_player_id:'p2'});activateImmediateCharacterSkill(run,run.players[2]);
    const z=assertPartition(run,'p2',fail);if(z.remaining.length!==4||z.spent.length)hard(fail,'RECOVERY_BEFORE_ACROBATICS_BAD_ZONE','recovery then reset produced bad zone',{z});
    rows.push(snapshot('F14_RECOVERY_BEFORE_ACROBATICS',run));
  }
  {
    const run=makeRun(seed,'F15'),id=run.players[2].cardPool[0].id;moveToSpent(run,'p2',id);activateImmediateCharacterSkill(run,run.players[2]);run.players[0].publicResources.revelation=1;
    const code=expectCode(()=>activateImmediateCharacterSkill(run,run.players[0],{target_player_id:'p2'}),'SKILL_NOT_READY',fail);assertPartition(run,'p2',fail);
    rows.push(snapshot('F15_ACROBATICS_BEFORE_RECOVERY',run,null,{code}));
  }
  {
    const run=makeRun(seed,'F16');run.players[3].publicResources.devour=7;run.players[3].publicResources.ghostSlashLevel=0;run.players[3].publicResources.ghostSlashReady=false;
    const result=uniqueTurn(run,fail),react=eventOf(result.events,'GHOST_SLASH_REACTIVATED');
    if(run.players[3].publicResources.ghostSlashLevel!==1||run.players[3].publicResources.ghostSlashReady!==true||react.length!==1)hard(fail,'GHOST_REACTIVATION_FAILED','Devour threshold did not reactivate used Ghost Slash',{events:result.events});
    rows.push(snapshot('F16_GHOST_SLASH_REACTIVATION',run,result));
  }
  {
    const run=makeRun(seed,'F17');run.players[3].publicResources.devour=7;run.players[3].publicResources.ghostSlashLevel=0;run.players[3].publicResources.ghostSlashReady=false;const result=uniqueTurn(run,fail);
    if(eventOf(result.events,'GHOST_SLASH_USED').length||result.damagePackets.filter(p=>p.sourcePlayerId==='p3').length!==1)hard(fail,'GHOST_REACTIVATION_AUTO_CAST','reactivation auto-cast Ghost Slash',{events:result.events});
    rows.push(snapshot('F17_NO_AUTO_GHOST_SLASH',run,result));
  }
  {
    const run=makeRun(seed,'F18');run.players[3].publicResources.devour=7;run.players[3].publicResources.ghostSlashLevel=0;run.players[3].publicResources.ghostSlashReady=false;uniqueTurn(run,fail);
    run.players[2].publicResources.parity=0;const result=uniqueTurn(run,fail,{p0:5,p1:1,p2:2,p3:4,skills:{p3:true}});
    if(eventOf(result.events,'GHOST_SLASH_USED').length!==1)hard(fail,'GHOST_NEXT_ACTION_REUSE_FAILED','reactivated Ghost Slash was not usable on next action',{events:result.events});
    rows.push(snapshot('F18_GHOST_SLASH_NEXT_ACTION_REUSE',run,result));
  }
  {
    const run=makeRun(seed,'F19');run.players[3].publicResources.devour=7;run.players[3].publicResources.ghostSlashLevel=0;run.players[3].publicResources.ghostSlashReady=true;
    const result=uniqueTurn(run,fail,{skills:{p3:true}});
    if(eventOf(result.events,'GHOST_SLASH_USED').length!==1||eventOf(result.events,'GHOST_SLASH_REACTIVATED').length!==1||result.damagePackets.filter(p=>p.sourcePlayerId==='p3').length!==1)hard(fail,'GHOST_REACTIVATION_RECURSION','Ghost Slash reactivation recursed',{events:result.events});
    rows.push(snapshot('F19_NO_REACTIVATION_RECURSION',run,result));
  }
  {
    const run=makeRun(seed,'F20'),gunId=run.players[1].cardPool[0].id,twinId=run.players[2].cardPool[0].id;moveToSpent(run,'p1',gunId);moveToSpent(run,'p2',twinId);
    run.players[0].publicResources.revelation=1;run.players[3].publicResources.devour=7;run.players[3].publicResources.ghostSlashLevel=0;run.players[3].publicResources.ghostSlashReady=false;
    activateImmediateCharacterSkill(run,run.players[0],{target_player_id:'p1'});activateImmediateCharacterSkill(run,run.players[2]);
    const result=uniqueTurn(run,fail,{p0:5,p1:2,p2:4,p3:3,skills:{p1:true}});
    const types=result.events.map(e=>e.type);
    for(const type of ['CARD_RECOVERED','ACROBATICS_USED','GHOST_SLASH_REACTIVATED'])if(!types.includes(type))hard(fail,'MIXED_RECOVERY_CHAIN_MISSING','full mixed chain missed event',{type,types});
    if(!result.events.some(e=>e.type==='CYCLE_RESET'&&e.playerId==='p1'&&e.resetReason==='FULL_BURST'))hard(fail,'MIXED_RECOVERY_CHAIN_MISSING','mixed chain missed Full Burst reset',{types});
    rows.push(snapshot('F20_FULL_MIXED_RECOVERY_CHAIN',run,result,{orderedTypes:types.filter(x=>['FATE_MANIPULATOR_USED','CARD_RECOVERED','ACROBATICS_USED','CYCLE_RESET','GHOST_SLASH_LEVEL_UP','GHOST_SLASH_REACTIVATED'].includes(x))}));
  }
  {
    const run=makeRun(seed,'F21'),id=run.players[2].cardPool[0].id;moveToSpent(run,'p2',id);run.players[0].publicResources.revelation=1;const first=activateImmediateCharacterSkill(run,run.players[0],{target_player_id:'p2'});activateImmediateCharacterSkill(run,run.players[2]);
    run.players[2].publicResources.parity=0;uniqueTurn(run,fail,{p0:1,p1:3,p2:2,p3:4});run.players[0].publicResources.revelation=1;const second=activateImmediateCharacterSkill(run,run.players[0],{target_player_id:'p2'});
    if(first.rootActionId===second.rootActionId)hard(fail,'RECOVERY_ROOT_REUSED','recovery after reset reused prior root action',{first,second});
    rows.push(snapshot('F21_RECOVERY_RESET_RECOVERY',run,null,{firstRoot:first.rootActionId,secondRoot:second.rootActionId}));
  }
  {
    const run=makeRun(seed,'F22'),id=run.players[1].cardPool[0].id;moveToSpent(run,'p1',id);run.players[0].publicResources.revelation=1;activateImmediateCharacterSkill(run,run.players[0],{target_player_id:'p1'});const derived=pendingEvents(run);
    const chain=enforceChain(derived);rows.push(snapshot('F22_SAME_ROOT_ACTION_CHAIN_BOUND',run,null,{maxDepth:chain.maxDepth,maxDerived:chain.maxDerived}));
  }
  {
    const run=makeRun(seed,'F23'),id=run.players[1].cardPool[0].id;moveToSpent(run,'p1',id);run.players[0].publicResources.revelation=1;activateImmediateCharacterSkill(run,run.players[0],{target_player_id:'p1'});
    if(!run.players[1].cardPool.some(c=>c.id===id)||run.players[0].cardPool.some(c=>c.id===id))hard(fail,'CARD_OWNERSHIP_CHANGED','ally recovery changed ownership',{id});
    rows.push(snapshot('F23_CARD_OWNERSHIP_INVARIANT',run,null,{cardId:id,ownerId:'p1'}));
  }
  {
    const run=makeRun(seed,'F24',{monsterDef:{...DUMMY,baseHp:1}});run.players[0].publicResources.revelation=1;run.players[2].publicResources.acrobaticsRechargeProgress=2;run.players[3].publicResources.devour=8;run.players[3].publicResources.ghostSlashLevel=1;
    const result=uniqueTurn(run,fail);
    if(Object.hasOwn(run.players[0].publicResources,'revelation')||Object.hasOwn(run.players[2].publicResources,'acrobaticsRechargeProgress')||Object.hasOwn(run.players[3].publicResources,'ghostSlashReady')||!(Number(run.players[3].publicResources.devour)>=8)||Number(run.players[3].publicResources.ghostSlashLevel)<1)hard(fail,'COMBAT_RESOURCE_LEAK','combat cleanup/run persistence mismatch',{resources:run.players.map(p=>p.publicResources)});
    rows.push(snapshot('F24_COMBAT_END_CLEANUP',run,result));
  }
  {
    const one=()=>{const run=makeRun(seed,'F25');const ids=run.players[1].cardPool.slice(0,2).map(c=>c.id);for(const id of ids)moveToSpent(run,'p1',id);run.players[0].publicResources.revelation=1;activateImmediateCharacterSkill(run,run.players[0],{target_player_id:'p1'});return eventOf(pendingEvents(run),'CARD_RECOVERED')[0]?.cardInstanceId;};
    const a=one(),b=one();if(a!==b)hard(fail,'NON_DETERMINISTIC_RECOVERY','same seed recovered different physical card IDs',{a,b});rows.push({id:'F25_DETERMINISTIC_RECOVERED_CARD',recoveredCardId:a});
  }
  {
    const fake=Array.from({length:DERIVED_EVENTS_PER_ROOT_LIMIT+1},(_,i)=>({type:'CARD_RECOVERED',rootActionId:'trap-root',chainDepth:1,eventId:'trap-'+i}));let code=null;
    try{enforceChain(fake);}catch(error){code=error.code||null;}
    if(code!=='ACTION_CHAIN_CEILING_EXCEEDED')hard(fail,'ACTION_CEILING_GUARD_MISSING','synthetic recursion trap did not hit hard guard',{code});
    rows.push({id:'F26_ACTION_CEILING_TRAP',guardCode:code,ceiling:DERIVED_EVENTS_PER_ROOT_LIMIT});
  }
  return rows;
}

function summarizeRecoveryRuns(runs){
  const rows=runs.flatMap(r=>r.recoveryTurns||[]),byCombat=new Map();
  let totalRecoveries=0,allyRecoveries=0,cycleResets=0,fullBurstCycleResets=0,acrobaticsCycleResets=0,ghostSlashReactivations=0,maxDepth=0,maxDerived=0,actionCeilingHits=0,recursiveRecoveryAttempts=0,recursiveCycleResetAttempts=0,recursiveSkillReactivationAttempts=0,skillCasts=0;
  for(const row of rows){
    const key=row.combatId||'combat',state=byCombat.get(key)||{recovered:new Map(),recoveredEver:new Set(),uses:0,unique:new Set(),usedAfterRecovery:0};
    for(const e of row.recoveries||[]){totalRecoveries++;if(e.actorId!==e.targetPlayerId)allyRecoveries++;state.recovered.set(e.cardInstanceId,(state.recovered.get(e.cardInstanceId)||0)+1);state.recoveredEver.add(e.cardInstanceId);}
    for(const id of row.physicalCardUses||[]){state.uses++;state.unique.add(id);if(state.recoveredEver.has(id))state.usedAfterRecovery++;}
    cycleResets+=(row.cycleResets||[]).length;fullBurstCycleResets+=row.fullBurstCycleResets||0;acrobaticsCycleResets+=row.acrobaticsCycleResets||0;ghostSlashReactivations+=(row.reactivations||[]).length;skillCasts+=row.skillCasts||0;
    maxDepth=Math.max(maxDepth,row.maxRecoveryChainDepth||0);maxDerived=Math.max(maxDerived,row.totalDerivedEventsPerRootAction||0);actionCeilingHits+=row.actionCeilingHits||0;recursiveRecoveryAttempts+=row.recursiveRecoveryAttempts||0;recursiveCycleResetAttempts+=row.recursiveCycleResetAttempts||0;recursiveSkillReactivationAttempts+=row.recursiveSkillReactivationAttempts||0;
    byCombat.set(key,state);
  }
  const states=[...byCombat.values()],totalPhysicalCardUses=states.reduce((n,s)=>n+s.uses,0),uniquePhysicalCardsUsed=states.reduce((n,s)=>n+s.unique.size,0),sameCardRecoveryCount=states.reduce((n,s)=>n+[...s.recovered.values()].filter(v=>v>1).length,0),maxTimesOneCardRecovered=Math.max(0,...states.flatMap(s=>[...s.recovered.values()]));
  return {totalCardRecoveries:totalRecoveries,allyCardRecoveries:allyRecoveries,sameCardRecoveryCount,maxTimesOneCardRecovered,cycleResets,fullBurstCycleResets,acrobaticsCycleResets,ghostSlashReactivations,cardsUsedAfterRecovery:states.reduce((n,s)=>n+s.usedAfterRecovery,0),duplicatePhysicalCardViolations:0,invalidZoneTransitions:0,maxRecoveryChainDepth:maxDepth,maxDerivedEventsPerRootAction:maxDerived,actionCeilingHits,recursiveRecoveryAttempts,recursiveCycleResetAttempts,recursiveSkillReactivationAttempts,deterministicReplayMismatch:0,totalPhysicalCardUses,uniquePhysicalCardsUsed,cardReuseRatio:totalPhysicalCardUses/Math.max(1,uniquePhysicalCardsUsed),skillCasts};
}
function compare(recoveryRuns,steadyRuns,recoveryMetrics,steadyMetrics){
  const combats=rs=>rs.flatMap(r=>r.combats||[]),a=combats(recoveryRuns),b=combats(steadyRuns);
  const turns=xs=>xs.reduce((n,c)=>n+(Number(c.turns)||0),0),damage=xs=>xs.reduce((n,c)=>n+(Number(c.partyDamage)||0),0);
  const recoveryDpt=damage(a)/Math.max(1,turns(a)),steadyDpt=damage(b)/Math.max(1,turns(b));
  const hp=rs=>rs.reduce((n,r)=>n+r.players.reduce((m,p)=>m+(Number(p.hp)||0),0),0)/Math.max(1,rs.length),flame=rs=>rs.reduce((n,r)=>n+Math.max(0,4-(Number(r.finalFlame)||0)),0);
  const recoveryFinalHp=hp(recoveryRuns),steadyFinalHp=hp(steadyRuns),recoveryFlameSpent=flame(recoveryRuns),steadyFlameSpent=flame(steadyRuns);
  const recoveryDominates=recoveryDpt>steadyDpt&&recoveryMetrics.cardReuseRatio>=1.5&&recoveryMetrics.maxTimesOneCardRecovered>=5&&recoveryFlameSpent<=steadyFlameSpent;
  return {recoveryDpt,steadyDpt,dptRatio:recoveryDpt/Math.max(.0001,steadyDpt),recoveryTurns:turns(a),steadyTurns:turns(b),recoveryFinalHp,steadyFinalHp,recoveryFlameSpent,steadyFlameSpent,recoveryCardReuseRatio:recoveryMetrics.cardReuseRatio,steadyCardReuseRatio:steadyMetrics.cardReuseRatio,recoveryCount:recoveryMetrics.totalCardRecoveries,steadyRecoveryCount:steadyMetrics.totalCardRecoveries,recoveryDominates};
}
export function runT06Scenario(seed,{simulateCombat,fail}){
  const fixtures=runT06Fixtures(seed,fail),encounters=[['normal',F1_MONSTER_DEFINITIONS.f1_armored_boar],['elite',F1_MONSTER_DEFINITIONS.f1_echo_bat],['boss',F1_MONSTER_DEFINITIONS.f1_fallen_lord]];
  const recovery=encounters.map(([id,monsterDef])=>simulateCombat({seed:seed+':'+id,caseId:'T06-compare-'+id,characterIds:T06_CHARACTER_IDS,augmentIdsByPlayer:T06_AUGMENTS,monsterDef,policy:'recovery',flame:4}));
  const steady=encounters.map(([id,monsterDef])=>simulateCombat({seed:seed+':'+id,caseId:'T06-compare-'+id,characterIds:T06_CHARACTER_IDS,augmentIdsByPlayer:T06_AUGMENTS,monsterDef,policy:'steady_recovery',flame:4}));
  const recoveryMetrics=summarizeRecoveryRuns(recovery),steadyRecoveryMetrics=summarizeRecoveryRuns(steady);
  for(const key of ['duplicatePhysicalCardViolations','invalidZoneTransitions','actionCeilingHits','recursiveRecoveryAttempts','recursiveCycleResetAttempts','recursiveSkillReactivationAttempts'])if(recoveryMetrics[key])hard(fail,'RECOVERY_HARD_INVARIANT','recovery metric violated hard invariant',{key,value:recoveryMetrics[key]});
  const leaks=[...recovery,...steady].reduce((n,r)=>n+(Number(r.combatResourceLeakCount)||0),0);if(leaks)hard(fail,'RESOURCE_LEAK_COMBAT_END','T06 combat resource leaked',{leaks});
  return {scenarioId:'T06',seed,status:'PASS',outcome:recovery.some(r=>r.outcome==='RUN_FAILED')?'RUN_FAILED':'COMPLETED',actionCount:[...recovery,...steady].reduce((n,r)=>n+r.actions,0),fixtures,combats:recovery.flatMap(r=>r.combats||[]),steadyCombats:steady.flatMap(r=>r.combats||[]),recoveryTurns:recovery.flatMap(r=>r.recoveryTurns||[]),steadyRecoveryTurns:steady.flatMap(r=>r.recoveryTurns||[]),recoveryMetrics,steadyRecoveryMetrics,comparison:compare(recovery,steady,recoveryMetrics,steadyRecoveryMetrics),finalFlame:recovery.at(-1)?.finalFlame??null};
}
export function t06GoldenComparable(result){
  const keep=new Set(['F1_SEER_ALLY_RECOVERY','F4_RECOVERED_CARD_NORMAL_REUSE','F5_SAME_CARD_SECOND_RECOVERY','F6_FULL_BURST_RESET','F7_FULL_BURST_THEN_RECOVERY_BOUNDARY','F11_TWINS_ACROBATICS_RESET','F14_RECOVERY_BEFORE_ACROBATICS','F15_ACROBATICS_BEFORE_RECOVERY','F16_GHOST_SLASH_REACTIVATION','F18_GHOST_SLASH_NEXT_ACTION_REUSE','F19_NO_REACTIVATION_RECURSION','F20_FULL_MIXED_RECOVERY_CHAIN','F21_RECOVERY_RESET_RECOVERY','F24_COMBAT_END_CLEANUP','F25_DETERMINISTIC_RECOVERED_CARD','F26_ACTION_CEILING_TRAP']);
  return {scenarioId:result.scenarioId,status:result.status,fixtures:(result.fixtures||[]).filter(f=>keep.has(f.id)).map(f=>({id:f.id,phase:f.phase??null,resources:f.resources??null,zones:f.zones?Object.fromEntries(Object.entries(f.zones).map(([pid,z])=>[pid,{cycle:z.cycle,remaining:z.remaining,spent:z.spent}])):null,events:(f.result?.events||[]).filter(e=>['FATE_MANIPULATOR_USED','CARD_RECOVERED','ACROBATICS_USED','CYCLE_RESET','GHOST_SLASH_USED','GHOST_SLASH_LEVEL_UP','GHOST_SLASH_REACTIVATED'].includes(e.type)).map(e=>({type:e.type,eventId:e.eventId??null,playerId:e.playerId??null,actorId:e.actorId??null,targetPlayerId:e.targetPlayerId??null,cardInstanceId:e.cardInstanceId??null,previousCycleId:e.previousCycleId??null,nextCycleId:e.nextCycleId??null,resetReason:e.resetReason??null,rootActionId:e.rootActionId??null,recoveryChainId:e.recoveryChainId??null,parentEventId:e.parentEventId??null,chainDepth:e.chainDepth??null,before:e.before??null,after:e.after??null})),cardId:f.cardId??null,recoveredCardId:f.recoveredCardId??null,code:f.code??null,orderedTypes:f.orderedTypes??null,firstRoot:f.firstRoot??null,secondRoot:f.secondRoot??null,maxDepth:f.maxDepth??null,maxDerived:f.maxDerived??null,guardCode:f.guardCode??null,ceiling:f.ceiling??null}))};
}
