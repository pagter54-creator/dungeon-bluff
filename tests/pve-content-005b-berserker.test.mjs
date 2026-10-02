import test from 'node:test';
import assert from 'node:assert/strict';
import {newPlayerRunState,newCombatState} from '../supabase/functions/game-api/pve/model.js';
import {applyBerserker,planBerserkerCollisionHeal,afterBerserkerAttackCost,notifyBerserkerHeal} from '../supabase/functions/game-api/pve/berserker-runtime.js';
import {BERSERKER_CONTRACTS} from '../supabase/functions/game-api/pve/berserker-contracts.js';
import {AUGMENT_BY_ID,augmentCandidates} from '../supabase/functions/game-api/pve/augment-catalog.js';

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
