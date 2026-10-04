import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {CLASS_THEMES,MONSTER_THEMES,skillCues,monsterCue,patternPanelMarkup,cueWaves,activationCues} from '../src/pve-combat-presentation.js';
import {adaptPveTurnResult} from '../src/pve-gameplay-adapter.js';
import {F1_MONSTER_DEFINITIONS} from '../supabase/functions/game-api/pve/content-f1.js';
const players=[{playerId:'a',characterId:'mage',seat:0},{playerId:'b',characterId:'vampire',seat:1},{playerId:'c',characterId:'warrior',seat:2}];
const cards=n=>Array.from({length:n},(_,i)=>({playerId:['a','b','c'][i],finalNumber:i+1,valid:true}));
test('all thirteen class identities and thirty-six unique monster profiles',()=>{
 assert.equal(Object.keys(CLASS_THEMES).length,13);
 assert.equal(Object.keys(MONSTER_THEMES).length,36);
 assert.equal(new Set(Object.values(MONSTER_THEMES).map(t=>t.color)).size,36);
 for(const id of Object.keys(F1_MONSTER_DEFINITIONS))assert.ok(MONSTER_THEMES[id],id);
 for(const t of Object.values(MONSTER_THEMES)){assert.ok(t.glyph&&t.motif&&t.suppressionGlyph);assert.ok(Number.isFinite(t.activationAngle));}
});
test('skill ordering, actor target identity and semantic aggregation never expose event payload',()=>{
 const raw={cards:[],presentationMutations:[{effectId:'mage-amplify',actorId:'a',before:2,after:4},{effectId:'vampire-blood-command',actorId:'b',targetId:'c',actorBefore:1,targetBefore:5}],
 events:[{type:'CARD_RECOVERED',playerId:'a',cardInstanceId:'private',secret:'hidden'},{type:'CARD_RECOVERED',playerId:'a',cardInstanceId:'private2'}]};
 const snapshot=JSON.stringify(raw),cues=skillCues(raw,players);
 assert.equal(cues[0].phase,'selfModify');assert.equal(cues[0].value,'2 → 4');
 assert.equal(cues[1].targetId,'c');assert.equal(cues[2].count,2);
 assert.equal(JSON.stringify(raw),snapshot);assert.ok(!JSON.stringify(cues).includes('private'));assert.ok(!JSON.stringify(cues).includes('hidden'));
});
test('queue parallelizes actors and bounds repeated intervention waves without losing counts',()=>{
 const cues=Array.from({length:7},(_,i)=>({actorId:'a',count:1,label:'스킬'+i}));cues.push({actorId:'b',count:1,label:'보호'});
 const waves=cueWaves(cues);assert.equal(waves.length,3);assert.equal(waves[0].length,2);
 assert.equal(waves.flat().reduce((n,c)=>n+c.count,0),8);assert.ok(waves[2][0].label.includes('추가 효과'));
});
test('hunter telegraph preparation, activation, suppression and partial defense are different',()=>{
 const before={id:'f1_coward_hunter',intent:{type:'DIRECT_DAMAGE'},presentation:{}};
 assert.equal(monsterCue(before,{cards:cards(3)},{}).outcome,'BLOCKED');
 assert.equal(monsterCue(before,{cards:cards(2)},{}).outcome,'ACTIVE');
 assert.equal(monsterCue({...before,intent:{type:'CHARGE'}},{cards:cards(3)},{}).outcome,'WAIT');
 assert.equal(monsterCue(before,{cards:[],events:[{type:'PLAYER_DAMAGED',playerId:'a',rawDamage:2,amount:1,preventedDamage:1}]},{}).outcome,'PARTIAL');
});
test('DPS windows do not report suppression before expiry; accumulated damage includes current turn',()=>{
 const b={id:'f1_gatebreaker_colossus',presentation:{countdown:2,progress:25,threshold:30}};
 assert.equal(monsterCue(b,{totalDamage:8},{}).outcome,'WAIT');
 b.presentation.countdown=1;assert.equal(monsterCue(b,{totalDamage:5},{}).outcome,'BLOCKED');
 assert.equal(monsterCue(b,{totalDamage:4},{}).outcome,'ACTIVE');
});
test('explicit execution, thread, moon and hydra outcomes preserve their semantics',()=>{
 for(const [id,type,outcome] of [['f3_execution_golem','EXECUTION_CANCELLED','BLOCKED'],['f3_execution_golem','EXECUTION_FAILED','ACTIVE'],['f2_thread_witch','THREAD_RESOLVED','BLOCKED'],['f2_moon_eating_witch','MOON_THRESHOLD_FAILED','ACTIVE'],['f2_rootjaw_hydra','HYDRA_HEAD_REMOVED','PARTIAL']]){
  assert.equal(monsterCue({id,presentation:{}},{events:[{type,broken:true}]},{}).outcome,outcome);
 }
 assert.equal(monsterCue({id:'f3_execution_golem'}, {},{}).outcome,'WAIT');
});
test('telegraph escapes content, identifies public targets and preserves status/progress',()=>{
 const html=patternPanelMarkup({id:'f1_coward_hunter',ruleSummary:'<script>',intent:{payload:{targetPlayerId:'b'}},presentation:{statusText:'피해 12/30'}},players);
 assert.ok(html.includes('&lt;script&gt;'));assert.ok(html.includes('2번 자리'));assert.ok(html.includes('12/30'));
 assert.ok(!html.includes('<script>'));
});
test('adapter adds cues without changing resolved cards, damage packets or source result',()=>{
 const result={turn:1,cards:[{playerId:'a',cardInstanceId:'a1',baseNumber:2,finalNumber:4,valid:true,skillUsed:'amplify'}],totalDamage:4,damagePackets:[{sourcePlayerId:'a',amount:4}],events:[]};
 const before={id:'r',floor:1,depth:1,players,combat:{monster:{id:'f1_coward_hunter',hp:20,maxHp:20,intent:{type:'DIRECT_DAMAGE'}}}};
 const after={...before,combat:{monster:{...before.combat.monster,hp:16},publicTurnResult:result}};
 const snapshot=JSON.stringify(after),adapted=adaptPveTurnResult({characters:[]},before,after);
 assert.equal(adapted.totalDamage,4);assert.equal(adapted.cards[0].value,4);assert.equal(adapted.effects.find(e=>e.type==='attack').amount,4);
 assert.equal(adapted.pvePresentation.skills[0].phase,'selfModify');assert.equal(JSON.stringify(after),snapshot);
});
test('immediate skill changes are only emitted for same authoritative combat; reconnect snapshots do not replay',()=>{
 const before={id:'r',combat:{id:'c'},players:[{playerId:'a',characterId:'demon_swordsman',publicResources:{transformationActive:false}}]};
 const after=structuredClone(before);after.players[0].publicResources.transformationActive=true;
 assert.equal(activationCues(before,after)[0].kind,'transform');assert.deepEqual(activationCues(after,after),[]);
 after.combat.id='next';assert.deepEqual(activationCues(before,after),[]);
});
test('PVE checkpoint integration keeps normal competitive reveal defaults and cleanup',async()=>{
 const [fx,app]=await Promise.all(['../src/fx.js','../src/app.js'].map(p=>readFile(new URL(p,import.meta.url),'utf8')));
 assert.ok(fx.indexOf("onPvePhase('mutation')")<fx.indexOf('const duplicates'));
 assert.ok(fx.indexOf("onPvePhase('protection')")<fx.indexOf('const duplicates'));
 assert.ok(fx.indexOf('await onPvePattern()')>fx.indexOf('for (const effect of result.effects.filter(e => e.type ==='));
 assert.ok(app.includes('cuePlayer?.dispose()'));assert.ok(app.includes('patternPanelMarkup(monster,run.players)'));
});

import {describeMonsterPattern} from '../supabase/functions/game-api/pve/presentation.js';
import {createMonsterBehaviorState} from '../supabase/functions/game-api/pve/monster-behavior.js';
import {F2_MONSTER_DEFINITIONS} from '../supabase/functions/game-api/pve/content-f2.js';
import {F3_MONSTER_DEFINITIONS} from '../supabase/functions/game-api/pve/content-f3.js';
import {newPlayerRunState,newCombatState} from '../supabase/functions/game-api/pve/model.js';
import {beginTurn,submitCard,resolveBasicTurn} from '../supabase/functions/game-api/pve/combat.js';
import {projectRun} from '../supabase/functions/game-api/pve/projection.js';
test('every actual monster has a nonmutating authoritative descriptor with no state dump',()=>{
 for(const def of Object.values({...F1_MONSTER_DEFINITIONS,...F2_MONSTER_DEFINITIONS,...F3_MONSTER_DEFINITIONS})){
  const run={combat:{monster:{...structuredClone(def),presentation:{statusText:'공개 진행'},behaviorState:createMonsterBehaviorState(def.mechanic),intent:{type:'CHARGE'}}}};
  const snapshot=JSON.stringify(run),cue=describeMonsterPattern(run,[],0);
  assert.ok(['ACTIVE','BLOCKED','PARTIAL','WAIT'].includes(cue.outcome),def.id);assert.equal(JSON.stringify(run),snapshot);
  assert.equal(cue.detail,'공개 진행');assert.ok(!JSON.stringify(cue).includes('behaviorState'));
 }
});
test('authoritative metadata wins over ordinary damage and client heuristics',()=>{
 const b={id:'f2_thorn_dryad',intent:{type:'DIRECT_DAMAGE'}};
 const cue=monsterCue(b,{monsterPattern:{outcome:'WAIT',label:'가시 비활성',targetIds:[],detail:'공개'},events:[{type:'PLAYER_DAMAGED',playerId:'a',rawDamage:1,amount:1}]},{});
 assert.equal(cue.outcome,'WAIT');assert.equal(cue.label,'가시 비활성');
});
test('real hunter resolution projects suppression metadata without a second collision pass',()=>{
 const ps=Array.from({length:4},(_,i)=>newPlayerRunState({id:'p'+i,user_id:'u'+i,seat_index:i,member_type:'human',character_id:'adventurer'}));
 const run={id:'ux-real',seed:'ux',rngCounter:0,version:1,floor:1,depth:1,currentRoomNodeId:'n',phase:'COMBAT',players:ps,flame:5,maxFlame:5};
 run.combat=newCombatState(ps,90,'NORMAL_COMBAT',F1_MONSTER_DEFINITIONS.f1_coward_hunter);
 run.combat.turn=2;beginTurn(run);
 for(let i=0;i<ps.length;i++)submitCard(run,ps[i].playerId,ps[i].cardPool.find(c=>c.baseNumber===i+1).id,false,{});
 const resolved=resolveBasicTurn(run);
 assert.equal(resolved.monsterPattern.outcome,'BLOCKED');
 assert.equal(resolved.collisionResolutionPasses,1);assert.equal(resolved.postCollisionEffectPasses,1);
 const projected=projectRun(run,'p0');assert.equal(projected.combat.publicTurnResult.monsterPattern.label,'저지 성공');
 assert.ok(!projected.combat.monster.behaviorState);assert.equal(projected.combat.publicTurnResult.totalDamage,resolved.totalDamage);
});

import {createPveCuePlayer} from '../src/pve-combat-presentation-dom.js';
import {setMotionMode,getMotionMode} from '../src/motion.js';
test('reduced mode keeps readable result badges and cancellation removes pending nodes and listeners',async()=>{
 const previous=globalThis.document,mode=getMotionMode(),listeners=new Map();
 const node=()=>{const classes=new Set();return {dataset:{},children:[],style:{setProperty(){}},classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),toggle(x,on){on?classes.add(x):classes.delete(x);},contains:x=>classes.has(x)},append(c){c.parent=this;this.children.push(c);},remove(){if(this.parent)this.parent.children=this.parent.children.filter(x=>x!==this);},querySelector(){return null;}};};
 const actor=node();actor.dataset.player='a';const party=node(),root=node();
 root.isConnected=true;root.querySelector=s=>s==='.party-grid'?party:null;root.querySelectorAll=()=>[actor];
 globalThis.document={hidden:false,documentElement:node(),createElement:()=>{const n=node();n.setAttribute=()=>{};return n;},querySelector:()=>null,
 addEventListener:(t,fn)=>listeners.set(t,fn),removeEventListener:(t,fn)=>{if(listeners.get(t)===fn)listeners.delete(t);}};
 let player;
 try{
  setMotionMode('reduced');player=createPveCuePlayer(root);
  const promise=player.phase([{actorId:'a',targetId:'a',label:'복구',kind:'recover',value:'복구 완료',success:true,phase:'aftermath',count:1,theme:CLASS_THEMES.prophet}],'aftermath');
  assert.equal(actor.children.length,1);assert.ok(actor.children[0].textContent.includes('복구 완료'));
  assert.equal(actor.children[0].dataset.step,'result');
  player.cancel();await promise;assert.equal(actor.children.length,0);assert.ok(!actor.classList.contains('pve-cue-actor'));
  player.dispose();assert.equal(listeners.size,0);
 }finally{player?.dispose();globalThis.document=previous;setMotionMode(mode);}
});

import {describeResolvedSkills} from '../supabase/functions/game-api/pve/presentation.js';
test('prediction outcome publishes only resolved success, never hidden prediction target or number',()=>{
 const run={combat:{turn:2},players:[{playerId:'a',characterId:'prophet'}],augmentFramework:{cardState:{'a:seer':{prediction:{targetTurn:2,evaluatedTurn:2,success:false,targetPlayerId:'secret',number:6}}}}};
 const hints=describeResolvedSkills(run,[]);assert.deepEqual(hints,[{actorId:'a',kind:'PREDICTION_RESULT',success:false}]);
 const cues=skillCues({skillInterventions:hints},[{playerId:'a',characterId:'prophet'}]);
 assert.equal(cues[0].label,'예측');assert.equal(cues[0].success,false);assert.ok(!JSON.stringify(cues).includes('secret'));
 run.combat.turn=3;assert.deepEqual(describeResolvedSkills(run,[]),[]);
});
