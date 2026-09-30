import test from 'node:test';
import assert from 'node:assert/strict';
import {dispatchAugmentTrigger,makeAugmentEnvelope,onceKey,cleanupAugmentScope,projectAugmentFramework,recoverPhysicalCard,drawPhysicalCard,movePhysicalCard,applyDamageOperation,applyVitalOperation,scheduleDelayed,resolveDelayed,getEffectiveRule,acquireAugmentOnce,CLASS_ADAPTERS,resolveClassAugmentHook} from '../supabase/functions/game-api/pve/augment-framework.js';

const fixture=()=>{
  const player={playerId:'p1',characterId:'adventurer',augments:['aug-test'],relics:[],cardPool:[1,2,3].map(n=>({id:'c'+n,baseNumber:n})),hp:2,maxHp:3,runGold:0,growthExp:0};
  const priv={cycleIndex:1,remainingCardIds:['c1','c2'],spentCardIds:['c3']};
  const run={id:'run-test',version:1,seed:'seed',rngCounter:0,phase:'COMBAT',floor:1,currentRoomNodeId:'room-1',players:[player],combat:{id:'combat-1',turn:1,privateByPlayer:{p1:priv},turnSubmissions:{}}};
  const add=(operations,other={})=>{run.frameworkEffects={'aug-test':[{id:'fixture',augmentId:'aug-test',trigger:'TURN_START',priority:1,onceScope:'NONE',resetScope:'COMBAT',visibility:'SERVER_ONLY',roomApplicability:{COMBAT:true},operations,...other}]};};
  return {run,player,priv,add};
};
const op=(type,other={})=>({type,...other});

test('P01 same-trigger priority then augment ID',()=>{
  const {run,player}=fixture();player.augments=['aug-b','aug-a'];
  run.frameworkEffects={'aug-b':[{id:'b',augmentId:'aug-b',trigger:'TURN_START',priority:2,operations:[op('ADD_RUN_GOLD',{amount:1,applicationId:'b'})]}],'aug-a':[{id:'a',augmentId:'aug-a',trigger:'TURN_START',priority:2,operations:[op('ADD_RUN_GOLD',{amount:1,applicationId:'a'})]}]};
  assert.deepEqual(dispatchAugmentTrigger(run,'TURN_START').map(x=>x.augmentId),['aug-a','aug-b']);
});
for(const [label,scope,advance] of [
  ['P02','ONCE_PER_TURN',r=>r.combat.turn++],
  ['P03','ONCE_PER_CYCLE',r=>r.combat.privateByPlayer.p1.cycleIndex++],
  ['P04','ONCE_PER_COMBAT',r=>r.combat.id='combat-2']
])test(label+' once scope',()=>{
  const {run,player,add}=fixture();add([op('ADD_RUN_GOLD',{amount:1})],{onceScope:scope});
  assert.equal(dispatchAugmentTrigger(run,'TURN_START')[0].applied,true);
  assert.equal(dispatchAugmentTrigger(run,'TURN_START')[0].reason,'ONCE_SCOPE_USED');
  advance(run);assert.equal(dispatchAugmentTrigger(run,'TURN_START')[0].applied,true);
  assert.equal(player.runGold,2);
});
test('P05 persistence and scoped cleanup',()=>{
  const {run,player}=fixture();run.augmentFramework={once:{},statuses:[{statusId:'x',resetScope:'COMBAT',visibility:'PUBLIC'},{statusId:'y',resetScope:'RUN',visibility:'PUBLIC'}],delayed:[],temporary:[],grants:{},acquired:{'p1:aug-test':{augmentId:'aug-test'}},telemetry:[],sequence:0};
  cleanupAugmentScope(run,'COMBAT');assert.deepEqual(run.augmentFramework.statuses.map(x=>x.statusId),['y']);assert.ok(run.augmentFramework.acquired['p1:aug-test']);assert.deepEqual(player.augments,['aug-test']);
});
test('P06 visibility hides private and server statuses',()=>{
  const {run}=fixture();run.augmentFramework={statuses:[{visibility:'PUBLIC',statusId:'a'},{visibility:'OWNER_PRIVATE',ownerId:'p1',statusId:'b'},{visibility:'SERVER_ONLY',statusId:'c'}]};
  assert.deepEqual(projectAugmentFramework(run,'p2').statuses.map(x=>x.statusId),['a']);
  assert.deepEqual(projectAugmentFramework(run,'p1').statuses.map(x=>x.statusId),['a','b']);
});
test('P07 status stack cap is explicit',()=>{
  const {run,add}=fixture();add([op('APPLY_STATUS',{statusId:'poison',cap:3,stacks:2})]);dispatchAugmentTrigger(run,'TURN_START');dispatchAugmentTrigger(run,'TURN_START');
  assert.equal(run.augmentFramework.statuses[0].stacks,3);
});
test('P08 recovery preserves physical card identity',()=>{
  const {run,player,priv}=fixture();const before=player.cardPool.length;
  assert.equal(recoverPhysicalCard(run,player,'c3',{privateState:priv}).applied,true);
  assert.equal(player.cardPool.length,before);assert.ok(priv.remainingCardIds.includes('c3'));assert.ok(!priv.spentCardIds.includes('c3'));
});
test('P09 recovery chain ceiling skips safely',()=>{
  const {run,player,priv}=fixture();assert.equal(recoverPhysicalCard(run,player,'c3',{privateState:priv,chainDepth:8,recoveryCeiling:8}).reason,'RECOVERY_CHAIN_CEILING');
});
test('P10 standard draw returns spent card',()=>{
  const {run,player,priv}=fixture();assert.equal(drawPhysicalCard(run,player,{privateState:priv}).cardInstanceId,'c3');
});
test('P11 Gambler draw uses dedicated zones',()=>{
  const {run,player,priv}=fixture();player.characterId='gambler';priv.drawPileIds=['c3'];priv.discardPileIds=[];priv.vanishedCardIds=[];
  assert.equal(drawPhysicalCard(run,player,{privateState:priv}).cardInstanceId,'c3');assert.ok(priv.remainingCardIds.includes('c3'));
});
for(const [label,type,start,value,expected] of [['P12','ADD_DAMAGE',3,2,5],['P13','SET_DAMAGE',3,2,2],['P14','MULTIPLY_DAMAGE',3,2,6]])
test(label+' damage operation',()=>{const damage={amount:start};assert.equal(applyDamageOperation(damage,op(type,{amount:value}),'COMBAT').applied,true);assert.equal(damage.amount,expected);});
test('P15 Event damage isolation',()=>{const damage={amount:3};assert.equal(applyDamageOperation(damage,op('ADD_DAMAGE',{amount:2}),'EVENT').applied,false);assert.equal(damage.amount,3);});
test('P16 Reward damage isolation',()=>{const damage={amount:3};assert.equal(applyDamageOperation(damage,op('ADD_DAMAGE',{amount:2}),'REWARD').applied,false);assert.equal(damage.amount,3);});
test('P17 heal cap',()=>{const {player}=fixture();const out=applyVitalOperation(player,op('HEAL',{amount:3,capMode:'MAX_HP'}));assert.equal(player.hp,3);assert.equal(out.preventedByCap,2);});
test('P18 class-safe self damage',()=>{const {player}=fixture();const out=applyVitalOperation(player,op('SELF_DAMAGE',{amount:3,canDown:false,minimumHp:1}));assert.equal(player.hp,1);assert.equal(out.downResult,false);});
test('P19 delayed reconnect serialization',()=>{const {run,player}=fixture();const envelope=makeAugmentEnvelope(run,player,'TURN_START');scheduleDelayed(run,{resolveAt:5,cancelCondition:{type:'NEVER'},resetScope:'COMBAT',sourceAugmentId:'aug-test',payload:{amount:1}},envelope);const restored=structuredClone(run);assert.equal(resolveDelayed(restored,5)[0].applied,true);});
test('P20 delayed cleanup',()=>{const {run,player}=fixture();scheduleDelayed(run,{resolveAt:5,cancelCondition:{type:'NEVER'},resetScope:'COMBAT',sourceAugmentId:'aug-test'},makeAugmentEnvelope(run,player,'TURN_START'));cleanupAugmentScope(run,'COMBAT');assert.equal(run.augmentFramework.delayed.length,0);});
test('P21 ON_ACQUIRE exactly once',()=>{const {run,player}=fixture();assert.equal(acquireAugmentOnce(run,player,'aug-test',{actionId:'a1'}).applied,true);assert.equal(acquireAugmentOnce(run,player,'aug-test',{actionId:'a1'}).applied,false);assert.equal(structuredClone(run).augmentFramework.acquired['p1:aug-test'].appliedAtActionId,'a1');});
for(const [label,type,field,extra] of [['P22','ADD_RUN_GOLD','runGold',{}],['P23','ADD_EXP','growthExp',{}],['P24','GRANT_RELIC','relics',{relicId:'relic-test'}]])
test(label+' economy idempotency',()=>{
  const {run,player,add}=fixture();add([op(type,{amount:1,applicationId:label,...extra})]);
  dispatchAugmentTrigger(run,'TURN_START');dispatchAugmentTrigger(run,'TURN_START');
  assert.equal(type==='GRANT_RELIC'?player.relics.filter(x=>x==='relic-test').length:player[field],1);
});
test('P25 effective rule modifiers do not mutate base',()=>{const base=4;assert.equal(getEffectiveRule(base,[{key:'mana',operation:'CAP_CHANGE',value:6,augmentId:'aug-test'}],'mana'),6);assert.equal(base,4);});
test('P26 class adapter hooks resolve without mutating base',()=>{const {run,player}=fixture();player.characterId='gunner';run.augmentFramework={temporary:[{ownerId:'p1',key:'magazine',operation:'ADD',value:1,augmentId:'aug-test'}]};assert.equal(resolveClassAugmentHook(run,player,'magazine',4),5);assert.deepEqual(Object.keys(CLASS_ADAPTERS),['gambler','gunner','demon_swordsman','vampire','imp','twins','martial_artist']);});
test('unsupported or ambiguous effects fail closed',()=>{const {run,add}=fixture();add([op('UNKNOWN')]);assert.throws(()=>dispatchAugmentTrigger(run,'TURN_START'),/UNSUPPORTED_AUGMENT_EFFECT/);});
test('room context rejects out-of-room effects',()=>{const {run,player,add}=fixture();add([op('ADD_RUN_GOLD',{amount:1})]);run.phase='REWARD_ROOM';assert.equal(dispatchAugmentTrigger(run,'TURN_START')[0].reason,'ROOM_NOT_APPLICABLE');assert.equal(player.runGold,0);});
test('physical zone move preserves ID',()=>{const {player,priv}=fixture();player.characterId='gambler';priv.drawPileIds=[];priv.discardPileIds=[];priv.vanishedCardIds=[];assert.equal(movePhysicalCard(player,'c2','HAND','DISCARD',{privateState:priv}).applied,true);assert.ok(priv.discardPileIds.includes('c2'));});
test('once key separates player ownership',()=>{const {run,player}=fixture();const other={...player,playerId:'p2'};assert.notEqual(onceKey(run,player,'aug-test','ONCE_PER_TURN'),onceKey(run,other,'aug-test','ONCE_PER_TURN'));});

test('cycle cleanup preserves another player’s scoped state',()=>{const {run}=fixture();run.augmentFramework={once:{},statuses:[{statusId:'a',ownerId:'p1',resetScope:'CYCLE'},{statusId:'b',ownerId:'p2',resetScope:'CYCLE'}],delayed:[],temporary:[]};cleanupAugmentScope(run,'CYCLE',{playerId:'p1'});assert.deepEqual(run.augmentFramework.statuses.map(x=>x.statusId),['b']);});
