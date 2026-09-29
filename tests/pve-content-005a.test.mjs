import test from 'node:test';
import assert from 'node:assert/strict';
import {AUGMENT_DEFINITIONS,augmentCandidates} from '../supabase/functions/game-api/pve/augment-catalog.js';
import {EXECUTABLE_AUGMENT_RUNTIME} from '../supabase/functions/game-api/pve/augment-runtime.js';
import {beginAugmentChoices,chooseAugment,dueAugmentTiers} from '../supabase/functions/game-api/pve/augments.js';
import {newPlayerRunState} from '../supabase/functions/game-api/pve/model.js';
import {projectRun} from '../supabase/functions/game-api/pve/projection.js';
import {applyEffectDefinitions} from '../supabase/functions/game-api/pve/effects.js';
import {augmentUi,PVE_EXECUTABLE_AUGMENT_UI} from '../src/pve-ui-catalog.js';
import {pveAugmentPopupMarkup} from '../src/pve-roguelike-ui.js';

const classes=['adventurer','warrior','rogue','mage','berserker','prophet','imp','gambler','gunner','martial_artist','vampire','demon_swordsman','twins'];
const id=n=>'aug-'+String(n).padStart(3,'0');
function slot(n){const classIndex=Math.floor((n-1)/30),within=(n-1)%30,buildIndex=Math.floor(within/10),offset=within%10;
  return {characterId:classes[classIndex],buildIndex,tier:offset===0?1:offset<=3?2:offset<=6?3:4,option:offset===0?1:(offset-1)%3+1};}
function makeRun(characterId='mage'){
  const player=newPlayerRunState({id:'p0',user_id:'u0',seat_index:0,member_type:'human',character_id:characterId});
  return {id:'audit-run',seed:'audit-seed',rngCounter:0,phase:'ROOM_RESULT',floor:1,players:[player],map:{depthCount:8}};
}

test('CONTENT-005A enumerates 390 stable conceptual slots and measures actual coverage',()=>{
  assert.equal(new Set(Array.from({length:390},(_,i)=>id(i+1))).size,390);
  assert.equal(AUGMENT_DEFINITIONS.length,217);
  const ids=AUGMENT_DEFINITIONS.map(x=>x.id);
  assert.equal(new Set(ids).size,ids.length);
  assert.equal(Object.keys(EXECUTABLE_AUGMENT_RUNTIME).length,19);
  assert.equal(AUGMENT_DEFINITIONS.filter(x=>x.executable===true).length,19);
  assert.equal(390-AUGMENT_DEFINITIONS.length,173);
  for(const def of AUGMENT_DEFINITIONS){
    const n=Number(def.id.slice(4)),expected=slot(n);
    assert.ok(n>=1&&n<=390,def.id);
    assert.equal(def.characterId,expected.characterId,def.id);
    assert.equal(def.tier,expected.tier,def.id);
    assert.equal(def.option,expected.option,def.id);
    assert.equal(def.sourceNumber,n,def.id);
    assert.ok(def.name&&def.build,def.id);
    assert.equal(AUGMENT_DEFINITIONS.filter(x=>x.characterId===def.characterId&&x.build===def.build&&x.tier===def.tier&&x.option===def.option).length,1,def.id);
  }
  for(const classId of classes){
    const defs=AUGMENT_DEFINITIONS.filter(x=>x.characterId===classId);
    assert.ok(defs.length<=30,classId);
    for(const tier of [1,2,3,4])for(const build of new Set(defs.map(x=>x.build)))
      assert.ok(augmentCandidates(classId,tier,build).length<=(tier===1?3:3),classId);
  }
});

test('CONTENT-005A only offers executable augments, locks the chosen archetype, and preserves the pending offer across reconnect',()=>{
  const run=makeRun('mage'),player=run.players[0];player.growthExp=800;
  assert.deepEqual(dueAugmentTiers(player),[1]);
  assert.equal(beginAugmentChoices(run,'ROOM_RESULT'),true);
  const offered=[...run.augmentChoice.offersByPlayer.p0];
  assert.deepEqual(offered,['aug-091','aug-101','aug-111']);
  assert.ok(offered.every(x=>AUGMENT_DEFINITIONS.find(d=>d.id===x)?.executable));
  const saved=structuredClone(run),view=projectRun(saved,'p0');
  assert.deepEqual(view.privateAugmentOffer,{tier:1,augmentIds:offered});
  assert.deepEqual(saved.augmentChoice.offersByPlayer.p0,offered);
  assert.throws(()=>chooseAugment(saved,'p0','aug-092'),/제시된/);
  chooseAugment(saved,'p0','aug-101');
  assert.equal(saved.players[0].augmentBuild,'백마도사');
  assert.deepEqual(saved.players[0].augments,['aug-101']);
  assert.deepEqual(saved.players[0].persistentCharacterState.augmentTiers,[1]);
  assert.equal(saved.phase,'ROOM_RESULT');
  assert.deepEqual(dueAugmentTiers(saved.players[0]),[]);
  assert.throws(()=>chooseAugment(saved,'p0','aug-101'),/선택 단계/);
});

test('CONTENT-005A executable choice cards disclose stage, archetype, and concrete effect summary',()=>{
  for(const def of AUGMENT_DEFINITIONS.filter(x=>x.executable)){
    const ui=augmentUi(def.id,def.tier);
    assert.equal(ui.name,def.name);
    assert.equal(ui.build,def.build);
    assert.ok(ui.description.length>15,def.id);
    assert.ok(!ui.description.includes('현재 서버의 증강 규칙'),def.id);
    assert.ok(PVE_EXECUTABLE_AUGMENT_UI[def.id],def.id);
  }
  const run=makeRun('mage');run.players[0].growthExp=50;beginAugmentChoices(run,'ROOM_RESULT');
  const html=pveAugmentPopupMarkup(projectRun(run,'p0'));
  assert.ok(html.includes('대마도 증폭'));
  assert.ok(html.includes('백마도사'));
  assert.ok(html.includes('역산술'));
  assert.ok(html.includes('TIER 1'));
});

test('CONTENT-005A effect priority and turn-scoped once counters are deterministic',()=>{
  const run=makeRun();const player=run.players[0];
  run.combat={id:'combat-a',turn:1,privateByPlayer:{p0:{playerId:'p0',cycleIndex:1,remainingCardIds:[],spentCardIds:[]}}};
  const defs=[
    {id:'later',trigger:'AUDIT_TRIGGER',priority:20,operations:[{type:'ADD_RESOURCE',resource:'audit',amount:2}],maxTriggers:1,resetScope:'TURN'},
    {id:'earlier',trigger:'AUDIT_TRIGGER',priority:10,operations:[{type:'SET_RESOURCE',resource:'audit',amount:1}],maxTriggers:1,resetScope:'TURN'}
  ];
  assert.deepEqual(applyEffectDefinitions(run,player,defs,'AUDIT_TRIGGER').map(x=>x.effectId),['earlier','later']);
  assert.equal(player.publicResources.audit,3);
  assert.equal(applyEffectDefinitions(run,player,defs,'AUDIT_TRIGGER').length,0);
  run.combat.turn=2;
  assert.equal(applyEffectDefinitions(run,player,defs,'AUDIT_TRIGGER').length,2);
  assert.equal(player.publicResources.audit,3);
});

test('CONTENT-005A private augment counters never enter another player projection',()=>{
  const run=makeRun();run.effectCounters={'p0:aug-091-mana-cap:combat:secret':1};
  run.combat={id:'secret',effectCounters:{private:'counter'},privateByPlayer:{p0:{playerId:'p0',remainingCardIds:[],spentCardIds:[]}},turnSubmissions:{}};
  const view=projectRun(run,'p0');
  assert.equal(view.effectCounters,undefined);
  assert.equal(view.combat.effectCounters,undefined);
  assert.equal(JSON.stringify(view).includes('combat:secret'),false);
});
