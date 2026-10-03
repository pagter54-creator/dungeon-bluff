import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {IMP_CONTRACTS,IMP_CONTRACT_IDS} from '../supabase/functions/game-api/pve/imp-contracts.js';
import {EXECUTABLE_AUGMENT_RUNTIME} from '../supabase/functions/game-api/pve/augment-runtime.js';
import {AUGMENT_BY_ID} from '../supabase/functions/game-api/pve/augment-catalog.js';
import {PVE_EXECUTABLE_AUGMENT_UI} from '../src/pve-ui-catalog.js';
import {
  impRoomAllowed,applyImpPreCollisionSteal,scopedImpState,cleanupImpCombat,impTelemetry
} from '../supabase/functions/game-api/pve/imp-runtime.js';
import {newPlayerRunState,newCombatState} from '../supabase/functions/game-api/pve/model.js';

const design=JSON.parse(fs.readFileSync(new URL('../docs/PVE_CONTENT_005Q_DESIGN_C.json',import.meta.url),'utf8'));
const source=Object.fromEntries(design.cards.filter(x=>{const n=+x.augmentId.slice(4);return n>=181&&n<=210;}).map(x=>[x.augmentId,x]));
function runFor(augments=['aug-201'],phase='COMBAT'){
  const ids=['imp','adventurer','warrior','mage'];
  const players=ids.map((character_id,i)=>newPlayerRunState({id:'p'+i,user_id:'u'+i,character_id,member_type:'human',seat_index:i}));
  players[0].augments=[...augments];
  const run={id:'imp-parity',seed:'imp-parity',rngCounter:0,phase,floor:1,depth:1,currentRoomNodeId:'room',players};
  if(phase==='COMBAT'){run.combat=newCombatState(players,999,'NORMAL_COMBAT');run.combat.id='imp-parity-combat';run.combat.turn=1;run.combat.phase='PRE_COLLISION_STEAL';}
  return {run,p:players[0],players};
}
function cards(run,nums=[2,2,2,4]){return run.players.map((p,i)=>({playerId:p.playerId,cardInstanceId:p.cardPool[0].id,baseNumber:nums[i],workingNumber:nums[i],finalNumber:nums[i],valid:true}));}

test('005C-B DESIGN-C parity is 30/30 across all executable contract fields',()=>{
  assert.equal(IMP_CONTRACT_IDS.length,30);
  for(const id of IMP_CONTRACT_IDS){
    const c=IMP_CONTRACTS[id],d=source[id];assert.ok(d,id);
    assert.equal(c.name,d.name,id);assert.equal(c.archetype,d.archetype,id);assert.equal(c.stage,d.stage,id);
    assert.deepEqual(c.trigger,d.trigger,id);assert.equal(c.timingPhase,d.timingPhase,id);assert.equal(c.condition,d.condition,id);
    assert.equal(c.effectType,d.effectType,id);assert.deepEqual(c.effectValue,d.effectValue,id);
    assert.deepEqual(c.roomApplicability,d.roomApplicability,id);assert.deepEqual(c.onceScope,d.onceScope,id);
    assert.deepEqual(c.resetScope,d.resetScope,id);assert.equal(c.persistenceScope,d.persistenceScope,id);
    assert.equal(c.visibility,d.visibility,id);assert.deepEqual(c.runtimePrimitivesRequired,d.runtimePrimitivesRequired,id);
    assert.equal(c.tooltip,d.tooltipBetaV02,id);assert.equal(c.runtimeHandler,'IMP_V02',id);assert.equal(c.executable,true,id);
  }
});
test('005C-B UI tooltip parity is exact for all 30 Imp augments',()=>{
  for(const id of IMP_CONTRACT_IDS){assert.equal(PVE_EXECUTABLE_AUGMENT_UI[id]?.build,IMP_CONTRACTS[id].archetype,id);assert.equal(PVE_EXECUTABLE_AUGMENT_UI[id]?.description,IMP_CONTRACTS[id].tooltip,id);}
});
test('005C-B room matrix is enforced from DESIGN-C without widening combat effects',()=>{
  for(const id of IMP_CONTRACT_IDS){
    for(const phase of ['COMBAT','EVENT','REWARD_ROOM','SHOP','REST']){
      const {run}=runFor([id],phase);const key=phase==='REWARD_ROOM'?'REWARD':phase;
      assert.equal(impRoomAllowed(run,id),Boolean(source[id].roomApplicability[key]),id+':'+key);
    }
  }
});
test('005C-B runtime registry has no silent data-only Imp entry',()=>{
  for(const id of IMP_CONTRACT_IDS){const rt=EXECUTABLE_AUGMENT_RUNTIME[id];assert.equal(rt?.executable,true,id);assert.ok(rt?.specialHandlers?.includes('IMP_V02'),id);assert.ok(AUGMENT_BY_ID[id],id);}
});
test('005C-B same steal root is idempotent and telemetry is not duplicated',()=>{
  const {run,p}=runFor(['aug-181']);const cs=cards(run);const events=[];
  applyImpPreCollisionSteal(run,cs,events);const first=cs.map(x=>x.workingNumber),telemetryCount=impTelemetry(run,'aug-181').length,eventCount=events.length;
  applyImpPreCollisionSteal(run,cs,events);
  assert.deepEqual(cs.map(x=>x.workingNumber),first);assert.equal(events.length,eventCount);assert.equal(impTelemetry(run,'aug-181').length,telemetryCount);assert.equal(p.characterId,'imp');
});
test('005C-B reconnect preserves owner-scoped Mischief and state without cross-Imp aliasing',()=>{
  const {run,players}=runFor(['aug-201']);players[1].characterId='imp';players[1].augments=['aug-201'];
  scopedImpState(run,players[0]).excitement=3;scopedImpState(run,players[1]).excitement=1;
  const cs=cards(run,[2,3,2,4]);applyImpPreCollisionSteal(run,cs,[]);
  const snap=structuredClone(run);assert.equal(snap.augmentFramework.imp.state.p0.excitement,3);assert.equal(snap.augmentFramework.imp.state.p1.excitement,1);
  assert.notEqual(snap.augmentFramework.imp.state.p0,snap.augmentFramework.imp.state.p1);
});
test('005C-B combat cleanup removes transient Imp state, Mischief and processed roots while ownership remains',()=>{
  const {run,p}=runFor(['aug-201']);const cs=cards(run);applyImpPreCollisionSteal(run,cs,[]);assert.ok(Object.keys(run.augmentFramework.imp.processedRoots).length);
  cleanupImpCombat(run,p);assert.equal(run.augmentFramework.imp.state.p0,undefined);assert.equal(Object.keys(run.augmentFramework.imp.mischief).length,0);assert.equal(Object.keys(run.augmentFramework.imp.processedRoots).length,0);assert.deepEqual(p.augments,['aug-201']);
});
test('005C-B aug-201 never acts on an already DOWNED victim',()=>{
  const {run,players}=runFor(['aug-201']);players[1].status='DOWNED';players[1].hp=0;const cs=cards(run,[2,2,3,4]);const events=[];applyImpPreCollisionSteal(run,cs,events);
  assert.equal(players[1].hp,0);assert.equal(events.some(e=>e.targetPlayerId==='p1'&&String(e.type||'').includes('MISCHIEF')),false);
});

test('005C-B aug-201 lethal Mischief explosion remains pending until DOWN_RESOLVE and permits same-resolve rescue',()=>{
  const {run,players}=runFor(['aug-201']);players[1].hp=1;
  let cs=cards(run,[2,2,3,4]);applyImpPreCollisionSteal(run,cs,[]);
  run.combat.turn=2;delete run.augmentFramework.imp.processedRoots['steal:imp-parity-combat:1:p0'];
  cs=cards(run,[2,2,3,4]);applyImpPreCollisionSteal(run,cs,[]);
  assert.equal(players[1].hp,0);assert.notEqual(players[1].status,'DOWNED');assert.ok(run.combat.pendingDownPlayerIds.includes('p1'));
  // Same-resolve protection/heal happens before DOWN_RESOLVE. A rescued HP value therefore remains live.
  players[1].hp=1;run.combat.pendingDownPlayerIds=run.combat.pendingDownPlayerIds.filter(id=>id!=='p1');
  assert.equal(players[1].status,'ACTIVE');assert.equal(players[1].hp,1);
});
