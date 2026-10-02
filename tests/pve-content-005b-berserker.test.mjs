import test from 'node:test';
import assert from 'node:assert/strict';
import {newPlayerRunState,newCombatState} from '../supabase/functions/game-api/pve/model.js';
import {applyBerserker,planBerserkerCollisionHeal,afterBerserkerAttackCost,notifyBerserkerHeal} from '../supabase/functions/game-api/pve/berserker-runtime.js';
import {BERSERKER_CONTRACTS} from '../supabase/functions/game-api/pve/berserker-contracts.js';
import {AUGMENT_BY_ID,augmentCandidates} from '../supabase/functions/game-api/pve/augment-catalog.js';
import {EXECUTABLE_AUGMENT_RUNTIME} from '../supabase/functions/game-api/pve/augment-runtime.js';
import {PVE_EXECUTABLE_AUGMENT_UI} from '../src/pve-ui-catalog.js';
import {beginAugmentChoices,chooseAugment} from '../supabase/functions/game-api/pve/augments.js';
import {resolvePostCollisionCharacter,applyPostPlayerAttackCharacter,baseDamageForCharacter} from '../supabase/functions/game-api/pve/characters.js';

function fixture(ids=[]){
  const chars=['berserker','mage','rogue','warrior'];
  const players=chars.map((character_id,i)=>newPlayerRunState({id:'p'+i,user_id:'u'+i,character_id,member_type:'human',seat_index:i}));
  const p=players[0];p.augments=[...ids];
  const run={id:'bz-005b',seed:'bz-005b',rngCounter:0,version:1,phase:'COMBAT',floor:1,depth:1,flame:4,maxFlame:5,currentRoomNodeId:'node',players};
  run.combat=newCombatState(players,999,'NORMAL_COMBAT',{id:'dummy',name:'dummy',tier:'NORMAL',baseHp:999,pattern:[{type:'CHARGE',telegraphText:'wait',payload:{}}]});
  run.combat.id='bz-combat';run.combat.turn=1;
  const fire=(trigger,resolved={},extra={})=>applyBerserker(run,trigger,{player:p,resolved,...extra});
  return {run,p,players,fire};
}
function card(valid=true,finalNumber=4){return {valid,finalNumber};}
function dmg(fire,r,amount=5){const damage={amount},followUps=[];fire('BEFORE_DAMAGE',r,{damage,followUps,followUp:false});return {amount:damage.amount,followUps};}
function incoming(fire,amount,extra={}){const incomingDamage={amount};fire('BEFORE_PLAYER_DAMAGE',{}, {incomingDamage,damageType:'DIRECT',...extra});return incomingDamage.amount;}
function damaged(fire,before,after,amount=before-after){fire('PLAYER_DAMAGED',{}, {damage:{amount},damageType:'DIRECT',hpBefore:before,hpAfter:after});}

test('Berserker registry is exact 30/30 executable with 1/3/3/3 per archetype',()=>{
  const ids=Array.from({length:30},(_,i)=>'aug-'+String(121+i).padStart(3,'0'));
  assert.equal(Object.keys(BERSERKER_CONTRACTS).length,30);
  for(const id of ids){assert.equal(AUGMENT_BY_ID[id].executable,true,id);assert.equal(AUGMENT_BY_ID[id].characterId,'berserker',id);}
  for(const build of ['피의 광전','불사 투사','최후의 격노']){
    assert.equal(augmentCandidates('berserker',1).filter(x=>x.build===build).length,1);
    for(const tier of [2,3,4])assert.equal(augmentCandidates('berserker',tier,build).length,3);
  }
});

test('positive aug-121 contract preserves actual HP-cost blood frenzy +2',()=>{assert.match(BERSERKER_CONTRACTS['aug-121'].value,/\+2/);});
test('positive aug-122 adds one on pending actual HP cost',()=>{const {p,fire}=fixture(['aug-122']);p.hp=2;const r=card();fire('CARD_VALIDATED',r);assert.equal(dmg(fire,r).amount,6);});
test('positive aug-123 arms the next valid attack after an HP-cost attack',()=>{const {p,fire}=fixture(['aug-123']);p.hp=2;fire('CARD_VALIDATED',card());const r=card();fire('CARD_VALIDATED',r);assert.equal(dmg(fire,r).amount,6);});
test('positive aug-124 actual heal arms next HP-cost attack +2',()=>{const {run,p,fire}=fixture(['aug-124']);p.hp=2;notifyBerserkerHeal(run,p,1,'TEST');const r=card();fire('CARD_VALIDATED',r);assert.equal(dmg(fire,r).amount,7);});
test('positive aug-125 second consecutive HP-cost valid attack gets +2',()=>{const {p,fire}=fixture(['aug-125']);p.hp=2;fire('CARD_VALIDATED',card());const r=card();fire('CARD_VALIDATED',r);assert.equal(dmg(fire,r).amount,7);});
test('positive aug-126 immediate next-turn higher FINAL_NUMBER gets +2',()=>{const {run,p,fire}=fixture(['aug-126']);p.hp=2;fire('CARD_VALIDATED',card(true,2));run.combat.turn=2;const r=card(true,5);fire('CARD_VALIDATED',r);assert.equal(dmg(fire,r).amount,7);});
test('positive aug-127 second HP-cost success schedules one heal',()=>{const {run,p,fire}=fixture(['aug-127']);p.hp=2;fire('CARD_VALIDATED',card());const r=card();fire('CARD_VALIDATED',r);assert.equal(r.berserkerHeal127,true);p.hp=1;afterBerserkerAttackCost(run,p,r,{before:2,after:1,cost:1,events:[]});assert.equal(p.hp,2);});
test('positive aug-128 reaches Blood Storm 4 and queues extra component 2',()=>{const {p,fire}=fixture(['aug-128']);p.hp=2;let r;for(let i=0;i<4;i++){r=card();fire('CARD_VALIDATED',r);}const out=dmg(fire,r);assert.equal(out.amount,9);assert.equal(out.followUps[0].amount,2);});
test('positive aug-129 stores vigor from healing and consumes it for damage',()=>{const {run,p,fire}=fixture(['aug-129']);p.hp=2;notifyBerserkerHeal(run,p,1);notifyBerserkerHeal(run,p,1);const r=card();fire('CARD_VALIDATED',r);assert.equal(dmg(fire,r).amount,9);});
test('positive aug-130 refunds one HP after actual HP-cost attack',()=>{const {run,p}=fixture(['aug-130']);p.hp=1;afterBerserkerAttackCost(run,p,card(),{before:2,after:1,cost:1,events:[]});assert.equal(p.hp,2);});

test('positive aug-131 keeps max-HP collision heal plan',()=>{const {run,p}=fixture(['aug-131']);p.hp=1;p.maxHp=3;const out=planBerserkerCollisionHeal(run,p,{}, {amount:1,healCap:p.maxHp});assert.equal(out.healCap,3);});
test('positive aug-132 increases collision heal amount by one',()=>{const {run,p}=fixture(['aug-131','aug-132']);const out=planBerserkerCollisionHeal(run,p,{}, {amount:1,healCap:3});assert.equal(out.amount,2);});
test('positive aug-133 adds one when Revenge is consumed',()=>{const {fire}=fixture(['aug-133']);const r={valid:true,finalNumber:4,revengeConsumed:1};fire('CARD_VALIDATED',r);assert.equal(dmg(fire,r).amount,6);});
test('positive aug-134 reduces first direct monster damage by one',()=>{const {fire}=fixture(['aug-134']);assert.equal(incoming(fire,3),2);});
test('positive aug-135 full-HP collision creates overflow protection',()=>{const {run,p,fire}=fixture(['aug-135']);p.hp=3;p.maxHp=3;planBerserkerCollisionHeal(run,p,{}, {amount:1,healCap:3});assert.equal(incoming(fire,2),1);});
test('positive aug-136 direct actual damage builds memory used by next Revenge attack',()=>{const {p,fire}=fixture(['aug-136']);damaged(fire,3,2,1);const r={valid:true,finalNumber:4,revengeConsumed:1};fire('CARD_VALIDATED',r);assert.equal(dmg(fire,r).amount,6);});
test('positive aug-137 Revenge attack heals exactly once',()=>{const {run,p}=fixture(['aug-137']);p.hp=1;const r={valid:true,revengeConsumed:1};afterBerserkerAttackCost(run,p,r,{before:1,after:1,cost:0,events:[]});assert.equal(p.hp,2);});
test('positive aug-138 lethal direct damage is capped to survival at HP1',()=>{const {p,fire}=fixture(['aug-138']);p.hp=3;assert.equal(incoming(fire,5),2);});
test('positive aug-139 alternating heal and direct damage builds Brawl damage',()=>{const {run,p,fire}=fixture(['aug-139']);notifyBerserkerHeal(run,p,1);damaged(fire,3,2,1);const r=card();fire('CARD_VALIDATED',r);assert.equal(dmg(fire,r).amount,6);});
test('positive aug-140 direct hit arms +4 Revenge and next-hit guard',()=>{const {p,fire}=fixture(['aug-140']);damaged(fire,3,2,1);const r={valid:true,finalNumber:4,revengeConsumed:1};fire('CARD_VALIDATED',r);assert.equal(dmg(fire,r).amount,9);assert.equal(incoming(fire,2),1);});

test('positive aug-141 acquire sets maxHP2 and HP1 attacks gain +2',()=>{const {p,fire}=fixture(['aug-141']);fire('ON_ACQUIRE');assert.equal(p.maxHp,2);p.hp=1;const r=card();fire('CARD_VALIDATED',r);assert.equal(dmg(fire,r).amount,7);});
test('positive aug-142 HP1 valid attack gains +1',()=>{const {p,fire}=fixture(['aug-142']);p.hp=1;const r=card();fire('CARD_VALIDATED',r);assert.equal(dmg(fire,r).amount,6);});
test('positive aug-143 HP1 streak builds Rage and stack damage',()=>{const {p,fire}=fixture(['aug-143']);p.hp=1;fire('CARD_VALIDATED',card());const r=card();fire('CARD_VALIDATED',r);assert.equal(dmg(fire,r).amount,7);});
test('positive aug-144 HP1 first direct damage is reduced by one',()=>{const {p,fire}=fixture(['aug-144']);p.hp=1;assert.equal(incoming(fire,2),1);});
test('positive aug-145 HP1 two-success setup powers next valid attack',()=>{const {p,fire}=fixture(['aug-145']);p.hp=1;fire('CARD_VALIDATED',card());fire('CARD_VALIDATED',card());const r=card();fire('CARD_VALIDATED',r);assert.equal(dmg(fire,r).amount,7);});
test('positive aug-146 converts first HP1 collision heal to protection',()=>{const {run,p,fire}=fixture(['aug-146']);p.hp=1;const out=planBerserkerCollisionHeal(run,p,{}, {amount:1,healCap:2});assert.equal(out.amount,0);assert.equal(incoming(fire,2),1);});
test('positive aug-147 HP1 high valid attack grants next direct protection',()=>{const {p,fire}=fixture(['aug-147']);p.hp=1;fire('CARD_VALIDATED',card(true,4));assert.equal(incoming(fire,2),1);});
test('positive aug-148 HP1 third success gets +4 and extra component2 once',()=>{const {p,fire}=fixture(['aug-148']);p.hp=1;fire('CARD_VALIDATED',card());fire('CARD_VALIDATED',card());const r=card();fire('CARD_VALIDATED',r);const out=dmg(fire,r);assert.equal(out.amount,9);assert.equal(out.followUps[0].amount,2);});
test('positive aug-149 first HP1 reach schedules two-turn Great Rage',()=>{const {run,p,fire}=fixture(['aug-149']);p.hp=1;damaged(fire,2,1,1);run.combat.turn=2;const r=card();fire('CARD_VALIDATED',r);assert.equal(dmg(fire,r).amount,8);});
test('positive aug-150 fixes maxHP1, grants +3 and Blood Armor',()=>{const {p,fire}=fixture(['aug-150']);fire('ON_ACQUIRE');assert.equal(p.maxHp,1);fire('COMBAT_START');const r=card();fire('CARD_VALIDATED',r);assert.equal(dmg(fire,r).amount,8);assert.equal(incoming(fire,3),0);});

test('negative Berserker cases preserve base and room invariants',()=>{
  const {run,p,fire}=fixture(['aug-122','aug-136','aug-142']);p.hp=1;
  let r=card();fire('CARD_VALIDATED',r);assert.equal(dmg(fire,r).amount,6);
  const before=structuredClone(run.augmentFramework||{});fire('PLAYER_DAMAGED',{}, {damage:{amount:0},damageType:'DIRECT',hpBefore:1,hpAfter:1});assert.deepEqual(run.augmentFramework?.berserker,before.berserker);
  run.phase='EVENT';r=card();fire('CARD_VALIDATED',r);assert.equal(dmg(fire,r).amount,5);
  run.phase='REWARD_ROOM';fire('CARD_VALIDATED',r);assert.equal(dmg(fire,r).amount,5);
});

test('reconnect preserves Berserker scoped state deterministically',()=>{
  const {run,p,fire}=fixture(['aug-136','aug-145','aug-149']);p.hp=1;damaged(fire,2,1,1);fire('CARD_VALIDATED',card());
  const clone=structuredClone(run);assert.deepEqual(clone.augmentFramework.berserker[p.playerId],run.augmentFramework.berserker[p.playerId]);
});

test('full 005B audit is 150/150 executable, reachable and tooltip-complete',()=>{
  const ids=Array.from({length:150},(_,i)=>'aug-'+String(i+1).padStart(3,'0'));
  assert.equal(ids.filter(id=>EXECUTABLE_AUGMENT_RUNTIME[id]?.executable).length,150);
  for(const id of ids){
    const def=AUGMENT_BY_ID[id];
    assert.ok(def,id+' catalog');
    assert.equal(def.executable,true,id+' executable');
    assert.ok(PVE_EXECUTABLE_AUGMENT_UI[id],id+' UI');
    assert.ok(PVE_EXECUTABLE_AUGMENT_UI[id].description&&!PVE_EXECUTABLE_AUGMENT_UI[id].description.includes('조건 달성 시'),id+' tooltip');
  }
  for(const [characterId,ranges] of Object.entries({adventurer:[1,30],warrior:[31,60],rogue:[61,90],mage:[91,120],berserker:[121,150]})){
    const [a,b]=ranges;
    assert.equal(ids.slice(a-1,b).filter(id=>AUGMENT_BY_ID[id]?.characterId===characterId&&AUGMENT_BY_ID[id]?.executable).length,30,characterId);
  }
});

for(const spec of [
  {build:'피의 광전',ids:['aug-121','aug-122','aug-125','aug-128']},
  {build:'불사 투사',ids:['aug-131','aug-132','aug-135','aug-138']},
  {build:'최후의 격노',ids:['aug-141','aug-142','aug-145','aug-148']}
])test('full Berserker archetype build reaches Stage 4: '+spec.build,()=>{
  const p=newPlayerRunState({id:'p0',user_id:'u0',character_id:'berserker',member_type:'human',seat_index:0});p.growthExp=750;
  const run={id:'berserker-build-'+spec.ids[0],seed:'berserker-build',rngCounter:0,version:1,phase:'ROOM_RESULT',floor:1,players:[p],map:{depthCount:8}};
  assert.equal(beginAugmentChoices(run,'ROOM_RESULT'),true);
  for(let tier=1;tier<=4;tier++){
    if(!run.augmentChoice){run.phase='ROOM_RESULT';assert.equal(beginAugmentChoices(run,'ROOM_RESULT'),true);}
    const offer=run.augmentChoice.offersByPlayer.p0;assert.equal(offer.length,3);assert.ok(offer.includes(spec.ids[tier-1]));if(tier>1)assert.ok(offer.every(id=>AUGMENT_BY_ID[id].build===spec.build));chooseAugment(run,'p0',spec.ids[tier-1]);
  }
  assert.deepEqual(p.augments,spec.ids);assert.deepEqual(p.persistentCharacterState.augmentTiers,[1,2,3,4]);
});

test('Berserker candidate acquisition survives reconnect and activates Stage-1 runtime',()=>{
  const p=newPlayerRunState({id:'p0',user_id:'u0',character_id:'berserker',member_type:'human',seat_index:0});
  p.growthExp=50;const run={id:'berserker-e2e',seed:'berserker-e2e',rngCounter:0,version:1,phase:'ROOM_RESULT',floor:1,players:[p],map:{depthCount:8}};
  assert.equal(beginAugmentChoices(run,'ROOM_RESULT'),true);assert.ok(run.augmentChoice.offersByPlayer.p0.includes('aug-121'));chooseAugment(run,'p0','aug-121');
  const saved=structuredClone(run),owner=saved.players[0];saved.phase='COMBAT';saved.combat={id:'c',turn:1,privateByPlayer:{p0:{cycleIndex:1}},turnSubmissions:{}};
  owner.hp=2;const resolved={valid:true,finalNumber:4};applyBerserker(saved,'CARD_VALIDATED',{player:owner,resolved});const damage={amount:4};applyBerserker(saved,'BEFORE_DAMAGE',{player:owner,resolved,damage,followUps:[],followUp:false});
  assert.ok(owner.augments.includes('aug-121'));
});

test('mixed Berserker + Mage + Rogue + Knight state remains isolated',()=>{
  const {run,p,players,fire}=fixture(['aug-149','aug-136']);
  players[1].augments=['aug-091'];players[1].publicResources.mana=3;
  players[2].augments=['aug-061'];players[2].publicResources.sneakyStack=1;
  players[3].augments=['aug-031'];players[3].publicResources.toughnessCharges=2;
  p.hp=1;damaged(fire,2,1,1);fire('CARD_VALIDATED',card());
  assert.equal(players[1].publicResources.mana,3);
  assert.equal(players[2].publicResources.sneakyStack,1);
  assert.equal(players[3].publicResources.toughnessCharges,2);
  assert.ok(run.augmentFramework.berserker[p.playerId]);
});

test('aug-149 triggers only on the first actual HP1 transition in a combat',()=>{
  const {run,p,fire}=fixture(['aug-149']);p.hp=1;damaged(fire,2,1,1);
  const first=run.augmentFramework.berserker[p.playerId].greatRageStartTurn;
  p.hp=2;notifyBerserkerHeal(run,p,1,'TEST_HEAL');run.combat.turn=2;p.hp=1;damaged(fire,2,1,1);
  assert.equal(run.augmentFramework.berserker[p.playerId].greatRageStartTurn,first);
  assert.equal(run.augmentFramework.telemetry.filter(x=>x.augmentId==='aug-149'&&x.firstHp1Triggers===1).length,1);
});

test('aug-148 extra component cannot recursively create another Berserker extra component',()=>{
  const {run,p,fire}=fixture(['aug-148']);p.hp=1;fire('CARD_VALIDATED',card());fire('CARD_VALIDATED',card());const r=card();fire('CARD_VALIDATED',r);
  const out=dmg(fire,r);assert.equal(out.followUps.length,1);
  const nestedDamage={amount:out.followUps[0].amount},nested=[];
  applyBerserker(run,'BEFORE_DAMAGE',{player:p,resolved:r,damage:nestedDamage,followUps:nested,followUp:true});
  assert.equal(nestedDamage.amount,2);assert.equal(nested.length,0);
});
