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
 assert.equal(cues[0].phase,'mutation');assert.equal(cues[0].value,'2 → 4');
 assert.equal(cues[1].targetId,'c');assert.equal(cues[2].count,2);
 assert.equal(JSON.stringify(raw),snapshot);assert.ok(!JSON.stringify(cues).includes('private'));assert.ok(!JSON.stringify(cues).includes('hidden'));
});
test('queue parallelizes actors and bounds repeated intervention waves without losing counts',()=>{
 const cues=Array.from({length:7},(_,i)=>({actorId:'a',count:1,label:'스킬'+i}));cues.push({actorId:'b',count:1,label:'보호'});
 const waves=cueWaves(cues);assert.equal(waves.length,3);assert.equal(waves[0].length,2);
 assert.equal(waves.flat().reduce((n,c)=>n+c.count,0),8);assert.ok(waves[2][0].label.includes('스킬6'));
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
 assert.equal(adapted.pvePresentation.skills[0].phase,'mutation');assert.equal(JSON.stringify(after),snapshot);
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
