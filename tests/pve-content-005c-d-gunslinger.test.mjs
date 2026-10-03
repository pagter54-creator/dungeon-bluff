import test from 'node:test';
import fs from 'node:fs';
import {PVE_EXECUTABLE_AUGMENT_UI} from '../src/pve-ui-catalog.js';
import assert from 'node:assert/strict';
import {newPlayerRunState,newCombatState} from '../supabase/functions/game-api/pve/model.js';
import {applyOwnedEffects} from '../supabase/functions/game-api/pve/effects.js';
import {beginTurn,submitCard,resolveBasicTurn} from '../supabase/functions/game-api/pve/combat.js';
import {GUNNER_CONTRACTS,GUNNER_CONTRACT_IDS} from '../supabase/functions/game-api/pve/gunner-contracts.js';
import {gunnerState,ensureGunnerMagazine,resolveGunnerSelected,gunnerPenetration,gunnerExtraComponent} from '../supabase/functions/game-api/pve/gunner-runtime.js';
import {AUGMENT_BY_ID,augmentCandidates} from '../supabase/functions/game-api/pve/augment-catalog.js';
import {EXECUTABLE_AUGMENT_RUNTIME} from '../supabase/functions/game-api/pve/augment-runtime.js';
import {enterRewardRoom,submitRewardCard} from '../supabase/functions/game-api/pve/rooms.js';
import {projectRun} from '../supabase/functions/game-api/pve/projection.js';
function fixture(ids=[],fourth='mage'){
 const players=['gunner','prophet','imp',fourth].map((character_id,i)=>newPlayerRunState({id:'p'+i,character_id,seat_index:i,member_type:'human'}));
 players[0].augments=ids;
 const run={id:'gunner-test',seed:'gunner-seed',rngCounter:0,phase:'COMBAT',floor:1,depth:1,currentRoomNodeId:'room',players,flame:5,maxFlame:5};
 run.combat=newCombatState(players,9999);run.combat.id='gunner-combat';beginTurn(run);
 const p=players[0],priv=run.combat.privateByPlayer.p0,s=gunnerState(run,p);
 return {run,p,priv,s};
}
function shot(x,{valid=true,skill=true,remaining=null,spent=null}={}){
 if(remaining!==null){x.priv.remainingCardIds=x.p.cardPool.slice(-remaining).map(c=>c.id);x.priv.spentCardIds=x.p.cardPool.filter(c=>!x.priv.remainingCardIds.includes(c.id)).map(c=>c.id);}
 if(spent!==null){x.priv.spentCardIds=x.p.cardPool.slice(0,spent).map(c=>c.id);x.priv.remainingCardIds=x.p.cardPool.slice(spent).map(c=>c.id);}
 const card=x.p.cardPool.find(c=>c.id===x.priv.remainingCardIds[0]);
 const r={playerId:'p0',cardInstanceId:card.id,baseNumber:card.baseNumber,finalNumber:card.baseNumber,valid,...(!valid?{invalidReason:'COLLISION'}:{})};
 if(skill)applyOwnedEffects(x.run,'ON_SKILL_USE',{player:x.p,resolved:r});
 resolveGunnerSelected(x.run,x.p,r,{skillIntent:skill},[]);
 return r;
}
function damage(x,r,followUp=false,id=null){const d={amount:0};applyOwnedEffects(x.run,'BEFORE_DAMAGE',{player:x.p,resolved:r,damage:d,followUp,sourceCardId:id});return d.amount;}
const baseFor=id=>Number(id.slice(4))>=251&&Number(id.slice(4))<=260?['aug-251']:Number(id.slice(4))>=261?['aug-261']:[];

test('005C-D all 30 cards are executable/candidate reachable with 3/9/9/9 and three locked lines',()=>{
 assert.equal(GUNNER_CONTRACT_IDS.length,30);
 for(const c of Object.values(GUNNER_CONTRACTS)){
   assert.equal(AUGMENT_BY_ID[c.augmentId].executable,true);
   assert.ok(augmentCandidates('gunner',c.stage,c.stage===1?undefined:c.archetype).some(d=>d.id===c.augmentId));
   if(c.stage>1)assert.ok(augmentCandidates('gunner',c.stage,c.archetype).every(d=>d.build===c.archetype));
 }
 assert.deepEqual([1,2,3,4].map(n=>Object.values(GUNNER_CONTRACTS).filter(c=>c.stage===n).length),[3,9,9,9]);
 const ids=Object.keys(EXECUTABLE_AUGMENT_RUNTIME).filter(id=>EXECUTABLE_AUGMENT_RUNTIME[id].executable===true);
 assert.equal(ids.filter(id=>Number(id.slice(4))>=151&&Number(id.slice(4))<=270).length,120);
 assert.equal(ids.filter(id=>Number(id.slice(4))<=270).length,270);
});

const positives={
 'aug-241':()=>{const x=fixture();const before=structuredClone(x.p.cardPool);x.p.augments=['aug-241'];assert.equal(ensureGunnerMagazine(x.run,x.p),true);assert.deepEqual(x.p.cardPool.map(c=>c.baseNumber),[1,2,2,3]);for(const c of before)assert.deepEqual(x.p.cardPool.find(d=>d.id===c.id),c);assert.equal(ensureGunnerMagazine(x.run,x.p),false);},
 'aug-242':()=>{const x=fixture(['aug-242']),r=shot(x);assert.equal(damage(x,r,true,r.followUpCardIds[0]),1);},
 'aug-243':()=>{const x=fixture(['aug-243']);x.s.afterBurstCycle=1;assert.equal(damage(x,shot(x,{skill:false})),1);},
 'aug-244':()=>{const x=fixture(['aug-244']);assert.equal(damage(x,shot(x)),1);},
 'aug-245':()=>{const x=fixture(['aug-245']);x.s.afterBurstCycle=1;assert.equal(damage(x,shot(x,{skill:false})),1);},
 'aug-246':()=>{const x=fixture(['aug-241','aug-246']);assert.equal(damage(x,shot(x)),4);},
 'aug-247':()=>{const x=fixture(['aug-247']);assert.equal(damage(x,shot(x,{remaining:2})),3);},
 'aug-248':()=>{const x=fixture(['aug-241','aug-248']),r=shot(x),c=gunnerExtraComponent(x.run,x.p,r);assert.equal(c.amount,5);assert.equal(c.createsSeparateHit,false);assert.equal(gunnerExtraComponent(x.run,x.p,r),null);},
 'aug-249':()=>{const x=fixture(['aug-249']);x.s.afterBurstCycle=1;shot(x,{skill:false});assert.equal(x.s.nextBurstBonus,3);x.run.combat.turn++;assert.equal(damage(x,shot(x)),3);},
 'aug-250':()=>{const x=fixture(['aug-250']);assert.equal(damage(x,shot(x,{remaining:1})),5);},
 'aug-251':()=>{const x=fixture(['aug-251']);assert.equal(damage(x,shot(x,{spent:2})),3);},
 'aug-252':()=>{const x=fixture(['aug-251','aug-252']);shot(x,{skill:false});assert.equal(x.s.precisionSetup,true);x.run.combat.turn++;assert.equal(damage(x,shot(x)),1);assert.equal(x.s.precisionSetup,false);},
 'aug-253':()=>{const x=fixture(['aug-251','aug-253']),r=shot(x,{valid:false});assert.equal(x.s.precisionShot.armed,true);assert.equal(x.s.aug253.preservationUsedThisCombat,true);const saved=structuredClone(x.s);resolveGunnerSelected(x.run,x.p,r,{skillIntent:true});assert.deepEqual(x.s,saved);x.run.combat.turn++;shot(x);assert.equal(x.s.precisionShot.armed,false);},
 'aug-254':()=>{const x=fixture(['aug-251','aug-254']);assert.equal(damage(x,shot(x,{remaining:1})),5);},
 'aug-255':()=>{const x=fixture(['aug-251','aug-255']);x.s.previousFinal=3;assert.equal(damage(x,shot(x)),2);},
 'aug-256':()=>{const x=fixture(['aug-251','aug-256']);shot(x);assert.equal(x.s.weakness,1);},
 'aug-257':()=>{const x=fixture(['aug-251','aug-257']),r=shot(x);assert.equal(gunnerPenetration(x.run,x.p,r,3),1);assert.equal(x.s.telemetry.defensePenetrated,1);},
 'aug-258':()=>{const x=fixture(['aug-251','aug-258']);x.s.precisionSetup=true;assert.equal(damage(x,shot(x,{remaining:1})),8);},
 'aug-259':()=>{const x=fixture(['aug-251','aug-259']);shot(x);assert.equal(x.s.accuracy,1);},
 'aug-260':()=>{const x=fixture(['aug-251','aug-260']);x.s.weakness=3;assert.equal(damage(x,shot(x,{remaining:1})),10);assert.equal(x.s.weakness,0);},
 'aug-261':()=>{const x=fixture(['aug-261']);shot(x);assert.equal(x.s.overheat,1);},
 'aug-262':()=>{const x=fixture(['aug-261','aug-262']);assert.equal(damage(x,shot(x)),1);},
 'aug-263':()=>{const x=fixture(['aug-261','aug-263']);x.s.overheat=3;applyOwnedEffects(x.run,'TURN_END',{player:x.p});assert.equal(x.s.overheat,1);},
 'aug-264':()=>{const x=fixture(['aug-261','aug-264']);x.s.overheat=2;assert.equal(damage(x,shot(x)),1);},
 'aug-265':()=>{const x=fixture(['aug-261','aug-265']);x.s.overheat=1;assert.equal(damage(x,shot(x)),3);},
 'aug-266':()=>{const x=fixture(['aug-261','aug-266']);shot(x);assert.equal(x.s.output,1);},
 'aug-267':()=>{const x=fixture(['aug-261','aug-267']);x.s.overheat=2;shot(x);assert.equal(x.s.overheat,1);assert.equal(x.s.once['aug-267:combat'],true);},
 'aug-268':()=>{const x=fixture(['aug-261','aug-268']);x.s.overheat=2;assert.equal(damage(x,shot(x)),4);},
 'aug-269':()=>{const x=fixture(['aug-269']);shot(x);assert.equal(x.s.output269,1);assert.equal(x.p.publicResources.burstReadyCycle,2);},
 'aug-270':()=>{const x=fixture(['aug-261','aug-270']);x.s.overheat=3;x.s.blockedTurn=1;assert.equal(damage(x,shot(x)),8);assert.equal(x.s.once['aug-270:combat'],true);}
};
for(const id of GUNNER_CONTRACT_IDS){
 test('005C-D actual effect positive '+id,positives[id]);
 test('005C-D contract negative wrong room '+id,()=>{
  const x=fixture([...new Set([...baseFor(id),id])]);x.run.phase='EVENT';
  const before=structuredClone(x.s),r={playerId:'p0',cardInstanceId:x.priv.remainingCardIds[0],baseNumber:1,finalNumber:1,valid:true};
  for(const trigger of ['ON_SKILL_USE','CARD_VALIDATED','BEFORE_DAMAGE','TURN_END'])applyOwnedEffects(x.run,trigger,{player:x.p,resolved:r,damage:{amount:1}});
  assert.deepEqual(x.s,before);assert.equal(resolveGunnerSelected(x.run,x.p,r,{skillIntent:true}),false);assert.equal(gunnerPenetration(x.run,x.p,r,3),0);assert.equal(gunnerExtraComponent(x.run,x.p,r),null);
 });
}
test('005C-D 253 preserves only activation and expires at cycle end; success/noncollision/general collision do not preserve',()=>{
 const x=fixture(['aug-251','aug-253']);x.s.precisionSetup=true;x.s.accuracy=2;x.s.weakness=3;
 shot(x,{valid:false});assert.equal(x.s.precisionSetup,true);assert.equal(x.s.accuracy,2);assert.equal(x.s.weakness,3);
 applyOwnedEffects(x.run,'CYCLE_END',{player:x.p});assert.equal(x.s.aug253.preservedForCycleId,null);assert.equal(x.s.aug253.preservationUsedThisCombat,true);
 const y=fixture(['aug-251','aug-253']);shot(y,{skill:false,valid:false});assert.equal(y.s.aug253.preservationUsedThisCombat,false);
 const z=fixture(['aug-251','aug-253']);shot(z);assert.equal(z.s.aug253.preservationUsedThisCombat,false);
});

test('005C-D same root activation resolution damage penetration and heat are retry safe',()=>{
 const x=fixture(['aug-261','aug-266','aug-269']),r=shot(x);const amount=damage(x,r),before=structuredClone(x.s);
 applyOwnedEffects(x.run,'ON_SKILL_USE',{player:x.p,resolved:r});resolveGunnerSelected(x.run,x.p,r,{skillIntent:true});assert.equal(damage(x,r),amount);assert.deepEqual(x.s,before);
});

test('005C-D defense zero never gives penetration free damage',()=>{
 const x=fixture(['aug-251','aug-257']),r=shot(x);assert.equal(gunnerPenetration(x.run,x.p,r,0),0);assert.equal(x.s.telemetry.defensePenetrated,0);
});

test('005C-D owner-only magazine/activation/once state survives reconnect at Heat 0..3',()=>{
 for(const heat of [0,1,2,3]){
  const x=fixture(['aug-261']);x.s.overheat=heat;x.s.activation={rootActionId:'pending',cycleId:1};
  const clone=structuredClone(x.run);assert.deepEqual(projectRun(clone,'p0').privateGunnerState,x.s);
  assert.equal(projectRun(clone,'p1').privateGunnerState,undefined);assert.equal(projectRun(clone,null).privateGunnerState,undefined);
  assert.equal(JSON.stringify(projectRun(clone,'p1')).includes('pending'),false);
 }
});

for(const build of ['전탄 난사','정밀 사수','과열 기관'])for(const fourth of ['mage','warrior','gambler']){
 test('005C-D full '+build+' build with Seer Imp '+fourth+' preserves one collision participant and deterministic state',()=>{
  const ids=GUNNER_CONTRACT_IDS.filter(id=>GUNNER_CONTRACTS[id].archetype===build);
  const a=fixture(ids,fourth),b=fixture(ids,fourth);
  for(const x of [a,b]){
   for(const p of x.run.players){p.hp=100;p.maxHp=100;}
   for(let t=0;t<8;t++){
    for(const p of x.run.players){
     const priv=x.run.combat.privateByPlayer[p.playerId];
     if(!x.run.combat.turnSubmissions[p.playerId])submitCard(x.run,p.playerId,t===0&&['p0','p2'].includes(p.playerId)?priv.remainingCardIds.at(-1):priv.remainingCardIds[0],p.playerId==='p0'&&p.publicResources.fullBurstReady===true);
    }
    x.run.combat.monster.intent={type:'CHARGE',payload:{}};
    const result=resolveBasicTurn(x.run);assert.equal(result.cards.length,4);
    assert.equal(new Set(result.damagePackets.map(p=>p.damageEventId)).size,result.damagePackets.length);
    assert.ok(gunnerState(x.run,x.p).overheat>=0&&gunnerState(x.run,x.p).overheat<=3);
   }
  }
  assert.ok(build==='정밀 사수'?gunnerState(a.run,a.p).telemetry.precisionTriggers>0:gunnerState(a.run,a.p).telemetry.burstSuccess>0);
  assert.deepEqual(gunnerState(a.run,a.p),gunnerState(b.run,b.p));
 });
}

function play(x,{gunnerNumber=1,collision=false}={}){
 for(const p of x.run.players){
  const priv=x.run.combat.privateByPlayer[p.playerId];
  const card=p.cardPool.find(c=>priv.remainingCardIds.includes(c.id)&&(p.playerId==='p0'?c.baseNumber===gunnerNumber:c.baseNumber===(collision?gunnerNumber:2)))||p.cardPool.find(c=>priv.remainingCardIds.includes(c.id));
  submitCard(x.run,p.playerId,card.id,p.playerId==='p0');
 }
 x.run.combat.monster.intent={type:'CHARGE',payload:{}};
 return resolveBasicTurn(x.run);
}
test('005C-D actual 4-card Burst orders three physical derived cards then one fixed component and advances once',()=>{
 const x=fixture(['aug-241','aug-242','aug-248']),ids=[x.priv.remainingCardIds.at(-1),...x.priv.remainingCardIds.slice(0,-1)],result=play(x,{gunnerNumber:3});
 const packets=result.damagePackets.filter(p=>p.sourcePlayerId==='p0');
 assert.equal(packets.length,5);assert.deepEqual(packets.slice(0,4).map(p=>p.sourceCardId),ids);
 assert.equal(packets[4].amount,5);assert.equal(packets[4].extraDamageComponent,true);assert.equal(packets[4].createsSeparateHit,false);
 assert.equal(result.cards.length,4);assert.equal(x.priv.cycleIndex,2);assert.equal(x.p.publicResources.burstReadyCycle,3);
 assert.equal(result.events.filter(e=>e.type==='CYCLE_RESET'&&e.playerId==='p0').length,1);
 const action=Object.values(x.s.burstActions)[0];
 assert.deepEqual(action.phases,['BURST_ACTIVATION','SELECTED_CARD_RESOLUTION','BURST_SUCCESS_OR_FAILURE','REMAINING_CARD_USE','DAMAGE_RESOLUTION','MAGAZINE/CYCLE_ADVANCE','COOLDOWN/RECHARGE']);
 assert.equal(action.rootActionId,packets[0].rootActionId);assert.equal(action.completed,true);assert.equal(x.s.telemetry.burstAttempts,1);assert.equal(x.s.telemetry.derivedCardsUsed,3);
 assert.equal(x.s.magazine.cycleIndex,2);assert.deepEqual(projectRun(structuredClone(x.run),'p0').privateGunnerState,x.s);
});
test('005C-D actual failed Burst consumes only selection; SELF damage reaches DOWN and spends Flame once',()=>{
 const x=fixture(['aug-241']);x.p.hp=1;const flame=x.run.flame,result=play(x,{collision:true});
 assert.equal(result.cards.find(c=>c.playerId==='p0').fullBurstOutcome,'FAIL_COLLISION');
 assert.equal(result.damagePackets.filter(p=>p.sourcePlayerId==='p0').length,0);
 assert.equal(x.priv.spentCardIds.length,1);assert.equal(x.priv.remainingCardIds.length,3);assert.equal(x.priv.cycleIndex,1);
 const failure=result.events.find(e=>e.type==='FULL_BURST_MISFIRE');
 assert.equal(failure.damageType,'SELF');assert.equal(failure.canDown,true);assert.equal(failure.minHP,0);assert.equal(failure.timing,'POST_PLAYER_ATTACK');
 assert.equal(x.run.flame,flame-1);assert.equal(x.p.hp,1);assert.equal(x.s.telemetry.failureSelfDamage,1);assert.equal(x.p.publicResources.burstReadyCycle,2);
});
test('005C-D actual Precision defense penetration precedes mitigation and retains physical magazine remainder',()=>{
 const a=fixture(['aug-251','aug-257']),b=fixture(['aug-251']);
 for(const x of [a,b]){x.priv.spentCardIds=x.p.cardPool.slice(0,2).map(c=>c.id);x.priv.remainingCardIds=[x.p.cardPool[2].id];x.run.combat.monster.defense=2;}
 const ar=play(a,{gunnerNumber:3}),br=play(b,{gunnerNumber:3});
 const ap=ar.damagePackets.find(p=>p.sourcePlayerId==='p0'),bp=br.damagePackets.find(p=>p.sourcePlayerId==='p0');
 assert.equal(ap.armorPenetration,1);assert.equal(ap.amount,bp.amount+1);assert.equal(a.s.telemetry.defensePenetrated,1);
 const partial=fixture(['aug-251']);play(partial);assert.equal(partial.priv.remainingCardIds.length,2);assert.equal(partial.priv.cycleIndex,1);
});
test('005C-D blocked Overheat turn retains Heat 1 and same turn cooling cannot consume it twice',()=>{
 const x=fixture(['aug-261']);x.s.overheat=2;shot(x);assert.equal(x.s.overheat,3);
 x.run.combat.turn++;applyOwnedEffects(x.run,'TURN_START',{player:x.p});assert.equal(x.p.publicResources.fullBurstReady,false);assert.equal(x.s.overheat,1);
 applyOwnedEffects(x.run,'TURN_END',{player:x.p});assert.equal(x.s.overheat,1);
 const saved=structuredClone(x.s);applyOwnedEffects(x.run,'TURN_END',{player:x.p});assert.deepEqual(x.s,saved);
});
test('005C-D 253 second collision consumes preserved activation and noncollision invalid never preserves',()=>{
 const x=fixture(['aug-251','aug-253']);shot(x,{valid:false});x.run.combat.turn++;shot(x,{valid:false});
 assert.equal(x.s.precisionShot.armed,false);assert.equal(x.s.telemetry.augment['aug-253'].successCount,1);
 const y=fixture(['aug-251','aug-253']);const r={playerId:'p0',cardInstanceId:y.priv.remainingCardIds[0],finalNumber:1,valid:false,invalidReason:'OTHER'};
 resolveGunnerSelected(y.run,y.p,r,{skillIntent:true});assert.equal(y.s.precisionShot.armed,false);assert.equal(y.s.aug253.preservationUsedThisCombat,false);
 const z=fixture(['aug-251','aug-253']);shot(z,{valid:false});
 assert.deepEqual(projectRun(structuredClone(z.run),'p0').privateGunnerState.aug253,z.s.aug253);
});
test('005C-D execution predicates reject non-last Deadeye and same-shot newly gained third Weakness',()=>{
 const x=fixture(['aug-251','aug-258']);x.priv.spentCardIds=['old-a','old-b'];assert.equal(damage(x,shot(x)),3);
 const y=fixture(['aug-251','aug-256','aug-260']);y.s.weakness=2;
 assert.equal(damage(y,shot(y,{remaining:1})),5);assert.equal(y.s.weakness,3);assert.equal(y.s.telemetry.augment['aug-260'],undefined);
});
test('005C-D pending activation reconnect resumes once with Heat, physical zones and cooldown intact',()=>{
 const x=fixture(['aug-261','aug-266']),r={playerId:'p0',cardInstanceId:x.priv.remainingCardIds[0],finalNumber:1,valid:true};
 applyOwnedEffects(x.run,'ON_SKILL_USE',{player:x.p,resolved:r});
 const run=structuredClone(x.run),p=run.players[0],s=gunnerState(run,p);
 applyOwnedEffects(run,'ON_SKILL_USE',{player:p,resolved:r});assert.equal(s.overheat,1);
 resolveGunnerSelected(run,p,r,{skillIntent:true});const before=structuredClone(s);resolveGunnerSelected(run,p,r,{skillIntent:true});
 assert.deepEqual(s,before);assert.equal(s.telemetry.burstAttempts,1);
});
test('005C-D two Gunners have independent Heat, Precision flags, magazines and once guards',()=>{
 const x=fixture(['aug-261']),other=newPlayerRunState({id:'p1',character_id:'gunner',seat_index:1,member_type:'human'});
 other.augments=['aug-251','aug-253'];x.run.players[1]=other;x.run.combat=newCombatState(x.run.players,9999);x.run.combat.id='two-gunners';beginTurn(x.run);
 const a=gunnerState(x.run,x.run.players[0]),b=gunnerState(x.run,other);
 const r={playerId:'p1',cardInstanceId:other.cardPool[0].id,finalNumber:1,valid:false,invalidReason:'COLLISION'};
 resolveGunnerSelected(x.run,other,r,{skillIntent:true});assert.equal(b.aug253.preservationUsedThisCombat,true);assert.equal(a.aug253.preservationUsedThisCombat,false);
 assert.equal(a.overheat,0);assert.equal(b.overheat,0);assert.notDeepEqual(a.magazine.magazineCardInstanceIds,b.magazine.magazineCardInstanceIds);
});
test('005C-D Reward submission rejects Burst rather than adding combat packets to ranking',()=>{
 const x=fixture(['aug-241','aug-248','aug-261']);enterRewardRoom(x.run);
 const st=x.run.roomState.privateByPlayer.p0,card=st.remainingCardIds[0];
 const before=structuredClone(x.s);assert.throws(()=>submitRewardCard(x.run,'p0',card,true),/보상방/);
 assert.deepEqual(x.s,before);assert.equal(x.run.roomState.turnSubmissions.p0,undefined);
});
test('005C-D all five room matrices, RUN output persistence and COMBAT cleanup are exact',()=>{
 for(const phase of ['EVENT','REWARD_ROOM','SHOP','REST']){
  const x=fixture(GUNNER_CONTRACT_IDS);x.run.phase=phase;const before=structuredClone(x.s);
  for(const trigger of ['ON_SKILL_USE','CARD_VALIDATED','BEFORE_DAMAGE','TURN_END'])applyOwnedEffects(x.run,trigger,{player:x.p,resolved:{playerId:'p0',cardInstanceId:x.p.cardPool[0].id,finalNumber:1,valid:true},damage:{amount:1}});
  assert.deepEqual(x.s,before);
 }
 const x=fixture(['aug-269','aug-261','aug-253']);x.s.output269=3;x.s.overheat=3;x.s.accuracy=4;
 applyOwnedEffects(x.run,'COMBAT_END',{player:x.p});assert.equal(x.s.output269,3);assert.equal(x.s.overheat,0);assert.equal(x.s.accuracy,0);assert.equal(x.s.aug253.preservationUsedThisCombat,false);
});

test('005C-D all 120 005C candidates are reachable and later stages respect each class build lock',()=>{
 for(const character of ['prophet','imp','gambler','gunner']){
  const first=augmentCandidates(character,1);assert.equal(first.length,3);
  const all=new Set(first.map(c=>c.id));
  for(const card of first)for(const stage of [2,3,4]){
   const candidates=augmentCandidates(character,stage,card.build);
   assert.equal(candidates.length,3);assert.ok(candidates.every(c=>c.build===card.build));candidates.forEach(c=>all.add(c.id));
  }
  assert.equal(all.size,30);
 }
});

test('005C-D Heat advances 0 to 3 without exceeding cap and forced failure keeps Heat3 with one penalty',()=>{
 const x=fixture(['aug-261']);
 for(let n=1;n<=4;n++){shot(x);assert.equal(x.s.overheat,Math.min(n,3));x.run.combat.turn++;}
 assert.equal(x.s.telemetry.maxOverheatReached,1);
 const y=fixture(['aug-261','aug-270']);y.s.overheat=3;y.s.blockedTurn=1;
 const r=shot(y,{valid:false});assert.equal(r.gunnerForced,true);assert.equal(r.burstMisfire,true);assert.equal(y.s.overheat,3);
 const saved=structuredClone(y.s);resolveGunnerSelected(y.run,y.p,r,{skillIntent:true});assert.deepEqual(y.s,saved);assert.equal(y.s.once['aug-270:combat'],true);
});
test('005C-D combat initialization retry preserves armed flags and RUN output survives new combat',()=>{
 const x=fixture(['aug-251','aug-253','aug-269']);shot(x,{valid:false});x.s.output269=2;
 const before=structuredClone(x.s);applyOwnedEffects(x.run,'COMBAT_START',{player:x.p});assert.deepEqual(x.s,before);
 applyOwnedEffects(x.run,'COMBAT_END',{player:x.p});x.run.combat.id='next-combat';
 applyOwnedEffects(x.run,'COMBAT_START',{player:x.p});const s=gunnerState(x.run,x.p);
 assert.equal(s.output269,2);assert.equal(s.aug253.preservationUsedThisCombat,false);assert.equal(s.precisionShot.armed,true);
});
test('005C-D failed Burst SELF cost never grants Berserker Revenge to another owner',()=>{
 const x=fixture(['aug-241'],'berserker');x.run.players[3].augments=['aug-131'];x.run.players[3].publicResources.revenge=0;
 play(x,{collision:true});assert.equal(x.run.players[3].publicResources.revenge,0);
});

test('005C-D immutable source projection and all 30 actual UI descriptions match runtime overlays',()=>{
 const design=JSON.parse(fs.readFileSync(new URL('../docs/PVE_CONTENT_005Q_DESIGN_C.json',import.meta.url),'utf8'));
 for(const id of GUNNER_CONTRACT_IDS){
  const contract=GUNNER_CONTRACTS[id];assert.equal(PVE_EXECUTABLE_AUGMENT_UI[id].description,contract.tooltipBetaV02);
  const source=design.cards.find(c=>c.augmentId===id);
  assert.equal(contract.augmentId,source.augmentId);assert.equal(contract.name,source.name);
  if(!['aug-248','aug-253','aug-257'].includes(id))assert.deepEqual(contract,source);
 }
 for(const id of ['aug-248','aug-253'])assert.equal(GUNNER_CONTRACTS[id].executionRuleSource,'USER_CONFIRMED_005C_D_PATCH');
 assert.equal(GUNNER_CONTRACTS['aug-248'].damageTaxonomy,'EXTRA_DAMAGE_COMPONENT');
 assert.ok(!GUNNER_CONTRACTS['aug-253'].runtimePrimitivesRequired.includes('MODIFY_INCOMING_DAMAGE'));
 const x=fixture(['aug-261','aug-266']);x.s.overheat=3;x.s.output=2;
 const other=projectRun(x.run,'p1');assert.equal(other.players[0].publicResources.overheat,3);assert.equal(other.players[0].publicResources.burstOutput,2);
 assert.equal(other.privateGunnerState,undefined);assert.equal(other.players[0].cardPool.some(c=>c.id),false);
});
