import test from 'node:test';
import assert from 'node:assert/strict';
import {newPlayerRunState,newCombatState} from '../supabase/functions/game-api/pve/model.js';
import {applyMage,mageNaturalManaRecovery,resolveMageWhiteMagicCollision,applyMageCollisionCorrection} from '../supabase/functions/game-api/pve/mage-runtime.js';
import {MAGE_CONTRACTS} from '../supabase/functions/game-api/pve/mage-contracts.js';
import {AUGMENT_BY_ID,augmentCandidates} from '../supabase/functions/game-api/pve/augment-catalog.js';
import {beginAugmentChoices,chooseAugment} from '../supabase/functions/game-api/pve/augments.js';
import {selfModifyCard,validateCharacterSkillIntent} from '../supabase/functions/game-api/pve/characters.js';

function fixture(ids=[]){
  const chars=['mage','rogue','warrior','adventurer'];
  const players=chars.map((character_id,i)=>newPlayerRunState({id:'p'+i,user_id:'u'+i,character_id,member_type:'human',seat_index:i}));
  const p=players[0];p.augments=[...ids];
  const run={id:'mage-005b',seed:'mage-005b',rngCounter:0,version:1,phase:'COMBAT',floor:1,depth:1,flame:4,maxFlame:5,currentRoomNodeId:'node',players};
  run.combat=newCombatState(players,999,'NORMAL_COMBAT',{id:'dummy',name:'dummy',tier:'NORMAL',baseHp:999,pattern:[{type:'CHARGE',telegraphText:'wait',payload:{}}]});
  run.combat.id='mage-combat';run.combat.turn=1;
  const priv=run.combat.privateByPlayer[p.playerId];
  const fire=(trigger,resolved={},extra={})=>applyMage(run,trigger,{player:p,resolved,privateState:priv,...extra});
  return {run,p,players,priv,fire};
}
function amp({valid=true,spent=2,before=4,finalNumber=3}={}){return {valid,skillUsed:'amplify',resourceSpent:spent,resourceBefore:before,resourceAfter:Math.max(0,before-spent),skillValue:spent===7?4:spent===6?3:spent===4?2:1,finalNumber};}
function rev(direction=1,magnitude=1,{valid=true,spent=magnitude===2?4:2,finalNumber=3}={}){return {valid,skillUsed:'reverse_math',resourceSpent:spent,resourceBefore:4,resourceAfter:Math.max(0,4-spent),skillValue:direction*magnitude,finalNumber};}
function damage(fire,r,amount=5){const d={amount};fire('BEFORE_DAMAGE',r,{damage:d,followUp:false});return d.amount;}
function af(run){return run.augmentFramework||=( {once:{},statuses:[],delayed:[],grants:{},acquired:{},temporary:[],telemetry:[],recoveryCounts:{},sequence:0} );}
function whiteFixture(ids,allyHps=[2,3,3]){
  const x=fixture(['aug-101',...ids]),{run,p,players}=x;
  players.slice(1).forEach((pl,i)=>{pl.hp=allyHps[i]??3;});
  const mageCard={playerId:p.playerId,valid:false,invalidReason:'COLLISION',resourceSpent:2,collisionEventId:'c1'};
  const group=[mageCard,...players.slice(1).map(pl=>({playerId:pl.playerId,valid:false,invalidReason:'COLLISION'}))];
  return {...x,mageCard,group,white:()=>resolveMageWhiteMagicCollision(run,mageCard,group,[])};
}

test('Mage runtime registry is exact 30/30 executable with 1/3/3/3 stages per archetype',()=>{
  const ids=Array.from({length:30},(_,i)=>'aug-'+String(91+i).padStart(3,'0'));
  assert.equal(Object.keys(MAGE_CONTRACTS).length,30);
  for(const id of ids){assert.equal(AUGMENT_BY_ID[id].executable,true,id);assert.equal(AUGMENT_BY_ID[id].characterId,'mage',id);}
  for(const build of ['대마도 증폭','백마도사','역산술']){
    assert.equal(augmentCandidates('mage',1).filter(x=>x.build===build).length,1);
    for(const tier of [2,3,4])assert.equal(augmentCandidates('mage',tier,build).length,3);
  }
});

test('positive aug-091 raises mana max to six and supports six-mana +3 amplification',()=>{
  const {p,fire}=fixture(['aug-091']);p.publicResources.mana=6;fire('COMBAT_START');
  assert.equal(p.publicResources.manaMax,6);
  const card=p.cardPool.find(c=>c.baseNumber===1),r={workingNumber:1,finalNumber:1};
  validateCharacterSkillIntent(p,null,true,card,{manaSpend:6});selfModifyCard(p,r,{skillIntent:true,skillData:{manaSpend:6}});
  assert.equal(r.finalNumber,4);assert.equal(r.resourceSpent,6);
});
test('positive aug-092 starts combat with mana one and max seven',()=>{
  const {p,fire}=fixture(['aug-091','aug-092']);p.publicResources.mana=0;fire('COMBAT_START');assert.equal(p.publicResources.manaMax,7);assert.equal(p.publicResources.mana,1);
});
test('positive aug-093 refunds one mana on valid amplification',()=>{
  const {p,fire}=fixture(['aug-093']);p.publicResources.mana=0;fire('CARD_VALIDATED',amp());assert.equal(p.publicResources.mana,1);
});
test('positive aug-094 adds two damage after spending at least four mana',()=>{
  const {fire}=fixture(['aug-094']);const r=amp({spent:4,before:4});fire('CARD_VALIDATED',r);assert.equal(damage(fire,r),7);
});
test('positive aug-095 snapshots full mana after turn-start recovery before spend',()=>{
  const {p,fire}=fixture(['aug-091','aug-095']);p.publicResources.manaMax=6;p.publicResources.mana=6;fire('TURN_START');const r=amp({spent:2,before:6});fire('CARD_VALIDATED',r);assert.equal(damage(fire,r),7);
});
test('positive aug-096 adds one to the next turn natural mana recovery',()=>{
  const {run,p,fire}=fixture(['aug-096']);p.publicResources.mana=0;fire('CARD_VALIDATED',amp());run.combat.turn=2;mageNaturalManaRecovery(run,p);assert.equal(p.publicResources.mana,2);
});
test('positive aug-097 adds four and skips next natural mana recovery',()=>{
  const {run,p,fire}=fixture(['aug-091','aug-097']);const r=amp({spent:6,before:6});fire('CARD_VALIDATED',r);assert.equal(damage(fire,r),9);p.publicResources.mana=0;run.combat.turn=2;mageNaturalManaRecovery(run,p);assert.equal(p.publicResources.mana,0);
});
test('positive aug-098 refunds half spent mana with per-turn cap two',()=>{
  const {p,fire}=fixture(['aug-098']);p.publicResources.mana=0;fire('CARD_VALIDATED',amp({spent:6,before:6}));assert.equal(p.publicResources.mana,2);
});
test('positive aug-099 sets max seven, permits spend seven and adds three damage',()=>{
  const {p,fire}=fixture(['aug-091','aug-099']);fire('COMBAT_START');p.publicResources.mana=7;
  const card=p.cardPool.find(c=>c.baseNumber===1),r={workingNumber:1,finalNumber:1};validateCharacterSkillIntent(p,null,true,card,{manaSpend:7});selfModifyCard(p,r,{skillIntent:true,skillData:{manaSpend:7}});
  assert.equal(r.finalNumber,5);r.valid=true;fire('CARD_VALIDATED',r);assert.equal(damage(fire,r),8);
});
test('positive aug-100 gives +4 now and +2 on the next valid attack once per combat',()=>{
  const {run,fire}=fixture(['aug-091','aug-100']);fire('COMBAT_START');const first=amp({spent:6,before:6});fire('CARD_VALIDATED',first);assert.equal(damage(fire,first),9);
  run.combat.turn=2;const second={valid:true,finalNumber:3};fire('CARD_VALIDATED',second);assert.equal(damage(fire,second),7);
});

test('positive aug-101 heals earliest-seat collided ally and excludes self',()=>{
  const {players,white,mageCard}=whiteFixture([], [2,1,1]);const out=white();assert.equal(out.healAmount,1);assert.equal(players[1].hp,3);assert.equal(mageCard.whiteMagicTargetId,players[1].playerId);
});
test('positive aug-102 protects an ally healed from HP one',()=>{
  const {run,players,white}=whiteFixture(['aug-102'],[1,3,3]);white();assert.ok(af(run).statuses.some(x=>x.sourceId==='aug-102'&&x.targetId===players[1].playerId));
});
test('positive aug-103 refunds one mana only after actual White Magic healing',()=>{
  const {p,white}=whiteFixture(['aug-103'],[2,3,3]);p.publicResources.mana=0;white();assert.equal(p.publicResources.mana,1);
});
test('positive aug-104 grants +2 to the healed ally next valid attack',()=>{
  const {run,players,white}=whiteFixture(['aug-104'],[2,3,3]);white();const ally=players[1],r={valid:true},d={amount:4};applyMage(run,'BEFORE_DAMAGE',{player:ally,resolved:r,damage:d,followUp:false});assert.equal(d.amount,6);
});
test('positive aug-105 chain-heals up to two collided allies by low HP then seat',()=>{
  const {players,white}=whiteFixture(['aug-105'],[1,2,3]);const out=white();assert.equal(out.healAmount,2);assert.equal(players[1].hp,2);assert.equal(players[2].hp,3);
});
test('positive aug-106 converts full-HP White Magic target into direct-damage protection',()=>{
  const {run,players,white}=whiteFixture(['aug-106'],[3,3,3]);white();assert.ok(af(run).statuses.some(x=>x.sourceId==='aug-106'&&x.targetId===players[1].playerId));
});
test('positive aug-107 deterministically cleanses earliest monster harmful status after actual heal',()=>{
  const {run,players,white}=whiteFixture(['aug-107'],[2,3,3]);const target=players[1];af(run).statuses.push(
    {statusId:'late',sourceType:'MONSTER',sourceId:'m',ownerId:'m',targetId:target.playerId,stacks:1,cap:1,payload:{harmful:true},appliedAt:2,resetScope:'COMBAT',visibility:'PUBLIC'},
    {statusId:'early',sourceType:'MONSTER',sourceId:'m',ownerId:'m',targetId:target.playerId,stacks:1,cap:1,payload:{harmful:true},appliedAt:1,resetScope:'COMBAT',visibility:'PUBLIC'}
  );white();assert.ok(!af(run).statuses.some(x=>x.statusId==='early'));assert.ok(af(run).statuses.some(x=>x.statusId==='late'));
});
test('positive aug-108 adds one lowest-HP extra ally heal once per combat',()=>{
  const {players,white}=whiteFixture(['aug-108'],[2,1,3]);const out=white();assert.equal(out.healAmount,2);assert.equal(players[1].hp,3);assert.equal(players[2].hp,2);
});
test('positive aug-109 protects each actually healed ally from next direct damage',()=>{
  const {run,players,white}=whiteFixture(['aug-109'],[2,3,3]);white();assert.ok(af(run).statuses.some(x=>x.sourceId==='aug-109'&&x.targetId===players[1].playerId));
});
test('positive aug-110 blesses healed ally attack and refunds mage mana on consumption',()=>{
  const {run,p,players,white}=whiteFixture(['aug-110'],[2,3,3]);p.publicResources.mana=0;white();const ally=players[1],d={amount:4};applyMage(run,'BEFORE_DAMAGE',{player:ally,resolved:{valid:true},damage:d,followUp:false});assert.equal(d.amount,6);assert.equal(p.publicResources.mana,1);
});

test('positive aug-111 applies signed SELF_MODIFY and spends the matching mana',()=>{
  const {p}=fixture(['aug-111']);p.publicResources.mana=4;const card=p.cardPool.find(c=>c.baseNumber===3),r={workingNumber:3,finalNumber:3};
  validateCharacterSkillIntent(p,null,true,card,{direction:-1,manaSpend:2});selfModifyCard(p,r,{skillIntent:true,skillData:{direction:-1,manaSpend:2}});
  assert.equal(r.finalNumber,2);assert.equal(r.skillUsed,'reverse_math');assert.equal(p.publicResources.mana,2);
});
test('positive aug-112 refunds one mana on valid downward reverse math',()=>{
  const {p,fire}=fixture(['aug-111','aug-112']);p.publicResources.mana=0;fire('CARD_VALIDATED',rev(-1,1));assert.equal(p.publicResources.mana,1);
});
test('positive aug-113 rewards valid boundary result with mana and two damage',()=>{
  const {p,fire}=fixture(['aug-111','aug-113']);p.publicResources.mana=0;const r=rev(-1,1,{finalNumber:0});fire('CARD_VALIDATED',r);assert.equal(p.publicResources.mana,1);assert.equal(damage(fire,r),7);
});
test('positive aug-114 grants one damage only when successful reverse direction alternates',()=>{
  const {run,fire}=fixture(['aug-111','aug-114']);fire('CARD_VALIDATED',rev(1));run.combat.turn=2;const r=rev(-1);fire('CARD_VALIDATED',r);assert.equal(damage(fire,r),6);
});
test('positive aug-115 avoids collision by one extra step in the same reverse direction once per cycle',()=>{
  const {run,p}=fixture(['aug-111','aug-115']);const a={playerId:p.playerId,finalNumber:3,workingNumber:3,skillUsed:'reverse_math',skillValue:1,numberHistory:{postStealNumber:3,finalNumber:3}},b={playerId:'p1',finalNumber:3,workingNumber:3,numberHistory:{postStealNumber:3,finalNumber:3}};
  const groups=new Map([[3,[a,b]]]);const out=applyMageCollisionCorrection(run,[a,b],groups,[]);assert.equal(a.finalNumber,4);assert.equal(out.get(4)[0],a);
});
test('positive aug-116 schedules +1 natural mana recovery next turn after magnitude-two success',()=>{
  const {run,p,fire}=fixture(['aug-111','aug-116']);p.publicResources.mana=0;fire('CARD_VALIDATED',rev(1,2,{spent:4}));run.combat.turn=2;mageNaturalManaRecovery(run,p);assert.equal(p.publicResources.mana,2);
});
test('positive aug-117 builds symmetry on alternating valid reverse directions and adds stack damage',()=>{
  const {run,fire}=fixture(['aug-111','aug-117']);fire('CARD_VALIDATED',rev(1));run.combat.turn=2;const r=rev(-1);fire('CARD_VALIDATED',r);assert.equal(damage(fire,r),6);
});
test('positive aug-118 auto-corrects colliding reverse card to nearest free number up to twice per combat',()=>{
  const {run,p}=fixture(['aug-111','aug-118']);const a={playerId:p.playerId,finalNumber:3,workingNumber:3,skillUsed:'reverse_math',skillValue:1,numberHistory:{postStealNumber:3,finalNumber:3}},b={playerId:'p1',finalNumber:3,workingNumber:3,numberHistory:{postStealNumber:3,finalNumber:3}};
  const out=applyMageCollisionCorrection(run,[a,b],new Map([[3,[a,b]]),[]);assert.equal(a.finalNumber,4);assert.equal(out.get(4)[0],a);
});
test('positive aug-119 gives +3 only to spend-four downward magnitude-two valid reverse',()=>{
  const {fire}=fixture(['aug-111','aug-119']);const r=rev(-1,2,{spent:4});fire('CARD_VALIDATED',r);assert.equal(damage(fire,r),8);
});
test('positive aug-120 alternation reaches max four and current attack receives stack damage',()=>{
  const {run,fire}=fixture(['aug-111','aug-120']);const dirs=[1,-1,1,-1,1];let r;
  for(let i=0;i<dirs.length;i++){run.combat.turn=i+1;r=rev(dirs[i]);fire('CARD_VALIDATED',r);}
  assert.equal(af(run).mage.p0.symmetry120,4);assert.equal(damage(fire,r),9);
});

test('negative Mage cases keep resources/effects legal and combat-only',()=>{
  const {run,p,fire}=fixture(['aug-091','aug-103','aug-107','aug-111','aug-112','aug-114']);p.publicResources.mana=1;
  const card=p.cardPool.find(c=>c.baseNumber===3);assert.throws(()=>validateCharacterSkillIntent(p,null,true,card,{manaSpend:2}));assert.equal(p.publicResources.mana,1);
  validateCharacterSkillIntent(p,null,false,card,null);assert.equal(p.publicResources.mana,1);
  const invalid=rev(-1,1,{valid:false});fire('CARD_VALIDATED',invalid);assert.equal(p.publicResources.mana,1);
  run.phase='EVENT';const r=amp({spent:4});fire('CARD_VALIDATED',r);assert.equal(damage(fire,r),5);
  run.phase='REWARD_ROOM';fire('CARD_VALIDATED',r);assert.equal(damage(fire,r),5);
});

test('White Magic overheal does not trigger actual-heal followups and cleanse ignores non-monster status',()=>{
  const {run,p,players,white}=whiteFixture(['aug-102','aug-103','aug-107'],[3,3,3]);p.publicResources.mana=0;
  af(run).statuses.push({statusId:'ally-augment',sourceType:'AUGMENT',sourceId:'x',ownerId:'p2',targetId:players[1].playerId,stacks:1,cap:1,payload:{harmful:true},appliedAt:1,resetScope:'COMBAT',visibility:'PUBLIC'});
  white();assert.equal(p.publicResources.mana,0);assert.ok(af(run).statuses.some(x=>x.statusId==='ally-augment'));assert.ok(!af(run).statuses.some(x=>x.sourceId==='aug-102'));
});

test('same reverse direction gives no aug-114 alternation bonus and aug-120 invalid/same direction decays',()=>{
  const {run,fire}=fixture(['aug-111','aug-114','aug-120']);fire('CARD_VALIDATED',rev(1));run.combat.turn=2;let r=rev(-1);fire('CARD_VALIDATED',r);assert.equal(af(run).mage.p0.symmetry120,1);
  run.combat.turn=3;r=rev(-1);fire('CARD_VALIDATED',r);assert.equal(af(run).mage.p0.symmetry120,0);assert.equal(damage(fire,r),5);
});

test('Mage reconnect preserves mana, direction, symmetry and White Magic state',()=>{
  const {run,p,fire}=fixture(['aug-111','aug-120','aug-101','aug-102']);p.publicResources.mana=3;fire('CARD_VALIDATED',rev(1));run.combat.turn=2;fire('CARD_VALIDATED',rev(-1));
  const restored=structuredClone(run);assert.equal(restored.players[0].publicResources.mana,3);assert.equal(restored.augmentFramework.mage.p0.lastSuccessfulReverseDirection,-1);assert.equal(restored.augmentFramework.mage.p0.symmetry120,1);
});

for(const spec of [
  {build:'대마도 증폭',ids:['aug-091','aug-092','aug-095','aug-098']},
  {build:'백마도사',ids:['aug-101','aug-102','aug-105','aug-108']},
  {build:'역산술',ids:['aug-111','aug-112','aug-115','aug-118']}
])test('full Mage archetype build reaches Stage 4: '+spec.build,()=>{
  const p=newPlayerRunState({id:'p0',user_id:'u0',character_id:'mage',member_type:'human',seat_index:0});p.growthExp=750;
  const run={id:'mage-build-'+spec.ids[0],seed:'mage-build',rngCounter:0,version:1,phase:'ROOM_RESULT',floor:1,players:[p],map:{depthCount:8}};
  assert.equal(beginAugmentChoices(run,'ROOM_RESULT'),true);
  for(let tier=1;tier<=4;tier++){
    if(!run.augmentChoice){run.phase='ROOM_RESULT';assert.equal(beginAugmentChoices(run,'ROOM_RESULT'),true);}
    const offer=run.augmentChoice.offersByPlayer.p0;assert.equal(offer.length,3);assert.ok(offer.includes(spec.ids[tier-1]));if(tier>1)assert.ok(offer.every(id=>AUGMENT_BY_ID[id].build===spec.build));chooseAugment(run,'p0',spec.ids[tier-1]);
  }
  assert.deepEqual(p.augments,spec.ids);assert.deepEqual(p.persistentCharacterState.augmentTiers,[1,2,3,4]);
});

test('Mage candidate acquisition survives reconnect and activates Stage-1 runtime',()=>{
  const p=newPlayerRunState({id:'p0',user_id:'u0',character_id:'mage',member_type:'human',seat_index:0});
  p.growthExp=50;const run={id:'mage-e2e',seed:'mage-e2e',rngCounter:0,version:1,phase:'ROOM_RESULT',floor:1,players:[p],map:{depthCount:8}};
  assert.equal(beginAugmentChoices(run,'ROOM_RESULT'),true);assert.ok(run.augmentChoice.offersByPlayer.p0.includes('aug-091'));chooseAugment(run,'p0','aug-091');
  const saved=structuredClone(run),owner=saved.players[0];saved.phase='COMBAT';saved.combat={id:'c',turn:1,privateByPlayer:{p0:{cycleIndex:1}},turnSubmissions:{}};
  applyMage(saved,'COMBAT_START',{player:owner});assert.equal(owner.publicResources.manaMax,6);
});

test('mixed Mage + Rogue + Knight + Adventurer state remains isolated under reverse SELF_MODIFY',()=>{
  const {run,p,players}=fixture(['aug-111']);players[1].augments=['aug-061'];players[2].augments=['aug-031'];players[3].augments=['aug-001'];
  players[1].publicResources.sneakyStack=1;players[2].publicResources.toughnessCharges=2;players[3].publicResources.veteranStreak=2;p.publicResources.mana=4;
  const card=p.cardPool.find(c=>c.baseNumber===3),r={workingNumber:3,finalNumber:3};selfModifyCard(p,r,{skillIntent:true,skillData:{direction:-1,manaSpend:2}});
  assert.equal(r.finalNumber,2);assert.equal(players[1].publicResources.sneakyStack,1);assert.equal(players[2].publicResources.toughnessCharges,2);assert.equal(players[3].publicResources.veteranStreak,2);
});

test('Mage tooltips/contracts contain no placeholder text and all positive IDs emit telemetry',()=>{
  for(const [id,contract] of Object.entries(MAGE_CONTRACTS)){assert.ok(contract.tooltip);assert.ok(!contract.tooltip.includes('조건 달성 시'),id);}
});
