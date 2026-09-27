import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pveMapGeometry,pveMapOverlayMarkup,pveShopMarkup,pveRestActionsMarkup,pveRelicStripMarkup,pveAugmentPopupMarkup,pveRoomResultOverlayMarkup} from '../src/pve-roguelike-ui.js';
import {pveGameplayPlayers,adaptPveTurnResult,adaptPveRewardResult} from '../src/pve-gameplay-adapter.js';
import {projectRun} from '../supabase/functions/game-api/pve/projection.js';
import {beginEntryLoading,finishEntryLoading} from '../supabase/functions/game-api/entry-loading.js';

const user='00000000-0000-4000-8000-000000000001';
const baseRun=()=>({
 id:'run-1',floor:1,depth:1,phase:'COMBAT',flame:4,maxFlame:5,currentRoomNodeId:'n1',
 map:{depthCount:3,currentNodeId:'n1',votes:{},nodes:[
  {id:'n1',depth:1,type:'NORMAL_COMBAT'},{id:'n2',depth:1,type:'EVENT'},
  {id:'n3',depth:2,type:'SHOP'},{id:'n4',depth:2,type:'REST'},{id:'boss',depth:3,type:'BOSS'}
 ],edges:{n1:['n3','n4'],n2:['n3','n4'],n3:['boss'],n4:['boss']}},
 players:[
  {playerId:'p0',userId:user,seat:0,memberType:'human',characterId:'mage',lobbyCharacterId:'mage',hp:3,maxHp:3,runGold:2,growthExp:4,augments:[],relics:['f1_worn_whetstone'],engravings:{},cardPool:[
   {id:'c1',baseNumber:1,source:'BASE'},{id:'c2',baseNumber:2,source:'BASE'},{id:'c3',baseNumber:3,source:'BASE'}
  ],publicResources:{mana:2},status:'ACTIVE'},
  {playerId:'p1',userId:null,seat:1,memberType:'ai',characterId:'warrior',lobbyCharacterId:'warrior',hp:3,maxHp:3,runGold:0,growthExp:0,augments:[],relics:[],engravings:{},cardPool:[
   {id:'a1',baseNumber:2,source:'BASE'},{id:'a2',baseNumber:3,source:'BASE'}
  ],publicResources:{toughnessCharges:1},status:'ACTIVE'}
 ],
 combat:{roomType:'NORMAL_COMBAT',phase:'SELECTION_OPEN',turn:2,monster:{id:'f1_armored_boar',name:'철갑 멧돼지',hp:70,maxHp:75,intent:{type:'CHARGE',telegraphText:'힘을 모은다'}},privateByPlayer:{
  p0:{playerId:'p0',cycleIndex:1,remainingCardIds:['c2','c3'],spentCardIds:['c1'],selectedCardId:'c2',skillIntent:true},
  p1:{playerId:'p1',cycleIndex:1,remainingCardIds:['a1'],spentCardIds:['a2'],selectedCardId:'a1'}
 },turnSubmissions:{p0:{playerId:'p0',cardInstanceId:'c2'},p1:{playerId:'p1',cardInstanceId:'a1'}}}
});
const bundle=run=>({members:[
 {id:'p0',user_id:user,member_type:'human',character_id:'mage',display_name:'A',loadout:{}},
 {id:'p1',user_id:null,member_type:'ai',character_id:'warrior',display_name:'AI',loadout:{}}
],characters:[
 {id:'mage',display_name:'마법사',deck:[1,2,3,4,4],definition:{color:'#88aaff',skill:{id:'amplify',type:'hybrid'},attackFx:'magic',attackSfx:'sfx_attack_mage'}},
 {id:'warrior',display_name:'기사',deck:[2,3,4,5,5],definition:{color:'#7799cc',skill:{id:'toughness',type:'active'},attackFx:'spear',attackSfx:'sfx_attack_warrior'}}
],run});

test('PVE-UI-01/20 competitive and PVE both route through shared Gameplay primitives',async()=>{
 const source=await readFile(new URL('../src/app.js',import.meta.url),'utf8');
 assert.match(source,/sharedGameTopMarkup/);assert.match(source,/sharedEncounterMarkup/);
 assert.match(source,/function renderPveGameplay/);assert.match(source,/function renderGame/);
});
test('PVE-UI-02 legacy text battle renderer is not imported by player app',async()=>{
 const source=await readFile(new URL('../src/app.js',import.meta.url),'utf8');
 assert.equal(source.includes('pve-beta-ui.js'),false);
 assert.equal(source.includes('pve-roguelike-ui.js'),true);
});
test('PVE-UI-03/04/05 PVE submit uses authoritative action and existing reveal pipeline',async()=>{
 const source=await readFile(new URL('../src/app.js',import.meta.url),'utf8');
 assert.match(source,/pve\.submitCard/);assert.match(source,/await reveal\(presentation\)/);assert.match(source,/adaptPveTurnResult/);
});
test('PVE-UI-06 attack presentation reuses competitive attackFx metadata',()=>{
 const before=projectRun(baseRun(),'p0');const after=structuredClone(before);
 after.combat.monster.hp=67;
 after.combat.publicTurnResult={turn:2,totalDamage:3,cards:[{playerId:'p0',cardInstanceId:'c2',finalNumber:3,valid:true}],damagePackets:[{sourcePlayerId:'p0',sourceCardId:'c2',numberUsed:3,amount:3,followUp:false}],events:[],presentationMutations:[]};
 const result=adaptPveTurnResult(bundle(after),before,after);
 assert.equal(result.effects.find(x=>x.type==='attack').attackFx,'magic');
});
test('PVE-UI-07 human asset preload reuses battle loading module',async()=>{
 const source=await readFile(new URL('../src/battle-loading.js',import.meta.url),'utf8');
 assert.match(source,/loadPveEntryAssets/);assert.match(source,/member=>member\.member_type==='human'/);
 const app=await readFile(new URL('../src/app.js',import.meta.url),'utf8');assert.match(app,/loadPveEntryAssets\(run,bundle\.members/);
});
test('PVE-UI-07 server reuses the existing human entry-loading barrier',async()=>{
 const run={phase:'MAP_VOTE'};beginEntryLoading(run);
 assert.deepEqual(run.entryLoading,{ready:[]});assert.equal(run.phase,'MAP_VOTE');
 const members=[{id:'p0',member_type:'human'},{id:'p1',member_type:'human'},{id:'p2',member_type:'ai'}];
 run.entryLoading.ready.push('p0');assert.equal(finishEntryLoading(run,members),false);
 run.entryLoading.ready.push('p1');assert.equal(finishEntryLoading(run,members),true);
 assert.equal(run.entryLoading,undefined);assert.equal(run.phase,'MAP_VOTE');
 const app=await readFile(new URL('../src/app.js',import.meta.url),'utf8');
 const api=await readFile(new URL('../supabase/functions/game-api/index.ts',import.meta.url),'utf8');
 assert.match(app,/api\.request\('assets_loaded'/);assert.match(app,/run\.entryLoading/);
 assert.match(api,/markPveEntryAssetsLoaded/);assert.match(api,/action==='assets_loaded'/);
});
test('PVE-UI-08/09 map draws actual DAG and combat map cannot vote',()=>{
 const run=projectRun(baseRun(),'p0'),geo=pveMapGeometry(run);
 assert.equal(geo.edges.length,6);assert.equal(geo.nodes.length,5);
 const html=pveMapOverlayMarkup(run,user,{visitedNodes:['n1']});
 assert.match(html,/경로 지도/);assert.doesNotMatch(html,/data-action="pve-vote"/);assert.match(html,/disabled/);
});
test('PVE-UI-10 MAP_VOTE exposes only connected server nodes as vote actions',()=>{
 const run=projectRun(baseRun(),'p0');run.phase='MAP_VOTE';
 const html=pveMapOverlayMarkup(run,user);
 assert.equal((html.match(/data-action="pve-vote"/g)||[]).length,2);
 assert.match(html,/data-node-id="n3"/);assert.match(html,/data-node-id="n4"/);
});
test('PVE projection exposes public card counting without hidden physical IDs or selection',()=>{
 const view=projectRun(baseRun(),'p0');
 assert.deepEqual(view.combat.publicCardCycles.p1.cards,[{baseNumber:2,used:false},{baseNumber:3,used:true}]);
 assert.equal(view.players[1].cardPool[0].id,undefined);
 assert.equal(view.combat.turnSubmissions,undefined);
 assert.equal(view.combat.publicCardCycles.p1.selectedCardId,undefined);
});
test('Reward Room public presentation never exposes physical card ids or hidden submissions',()=>{
 const raw=baseRun();raw.phase='REWARD_ROOM';raw.roomState={
  type:'REWARD_ROOM',attempt:1,
  privateByPlayer:{
   p0:{playerId:'p0',cycleIndex:1,remainingCardIds:['c2','c3'],spentCardIds:['c1'],selectedCardId:'c2'},
   p1:{playerId:'p1',cycleIndex:1,remainingCardIds:['a1'],spentCardIds:['a2'],selectedCardId:'a1'}
  },
  turnSubmissions:{
   p0:{playerId:'p0',cardInstanceId:'c2'},
   p1:{playerId:'p1',cardInstanceId:'a1'}
  },
  publicTurnResult:{attempt:1,success:false,cards:[
   {playerId:'p0',finalNumber:2,valid:false,collisionImmune:false,collisionGroupSize:2,damage:0},
   {playerId:'p1',finalNumber:2,valid:false,collisionImmune:false,collisionGroupSize:2,damage:0}
  ]}
 };
 const view=projectRun(raw,'p0'),serialized=JSON.stringify(view);
 assert.equal(view.privateRoomState.playerId,'p0');
 assert.equal(view.roomState.turnSubmissions,undefined);
 assert.equal(view.roomState.privateByPlayer,undefined);
 assert.equal(serialized.includes('"cardInstanceId"'),false);
 assert.equal(serialized.includes('"a1"'),false);
 assert.deepEqual(view.roomState.publicTurnResult.cards[1],{playerId:'p1',finalNumber:2,valid:false,collisionImmune:false,collisionGroupSize:2,damage:0});
});

test('PVE-UI-11/12 shop is data-driven and card purchase enters shared replacement selector flow',async()=>{
 const run=projectRun(baseRun(),'p0');run.phase='SHOP';run.roomState={type:'SHOP',cardStock:Array.from({length:4},(_,i)=>({id:'card-'+i,kind:'CARD',value:i+1,price:2,sold:false})),relicStock:Array.from({length:4},(_,i)=>({id:'relic-'+i,kind:'RELIC',relicId:'f1_worn_whetstone',price:4,sold:false}))};
 const html=pveShopMarkup(run);assert.equal((html.match(/data-action="pve-shop-item"/g)||[]).length,8);
 const replacement=pveShopMarkup(run,{reservation:'card-0',selectedCardId:'c2'});assert.match(replacement,/교체할 내 카드를 선택/);assert.match(replacement,/구매 \+ 교체 확정/);
 const app=await readFile(new URL('../src/app.js',import.meta.url),'utf8');
 assert.match(app,/pve\.shopReserveCard/);assert.match(app,/pve\.shopConfirmCard/);
 assert.match(app,/pve-shop-buy-relic-confirm/);assert.match(app,/pve-shop-buy-relic-apply/);
 assert.match(app,/pve-shop-confirm-card-apply/);
});
test('PVE-UI-13/14 Rest includes heal, Flame, and number engraving using card selector number value',async()=>{
 const run=projectRun(baseRun(),'p0');run.phase='REST';run.roomState={type:'REST',choicesByPlayer:{}};
 const html=pveRestActionsMarkup(run);assert.match(html,/FULL_HEAL/);assert.match(html,/FLAME/);assert.match(html,/Number Engraving/);
 const engraving=pveRestActionsMarkup(run,{engraveMode:true,selectedNumber:2});assert.match(engraving,/숫자 2 선택/);
 const app=await readFile(new URL('../src/app.js',import.meta.url),'utf8');
 assert.match(app,/pve-rest-engrave-apply/);assert.match(app,/choice:'ENGRAVE',number/);
});
test('PVE-UI-15 Event uses shared encounter shell rather than a separate PVE battle screen',async()=>{
 const source=await readFile(new URL('../src/app.js',import.meta.url),'utf8');
 assert.match(source,/run\.phase==='EVENT'.*pveEventActionsMarkup/s);assert.match(source,/sharedEncounterMarkup/);
});
test('PVE-UI-16 relic strip is per-player and tap/click inspectable',()=>{
 const run=projectRun(baseRun(),'p0'),html=pveRelicStripMarkup(bundle(run),run);
 assert.match(html,/pve-relic-owner/);assert.match(html,/data-action="pve-relic-info"/);assert.match(html,/닳은 숫돌/);
});
test('PVE-UI-17 augment offer renders three card-style choices when server provides three',()=>{
 const run=projectRun(baseRun(),'p0');run.phase='AUGMENT_CHOICE';run.privateAugmentOffer={tier:1,augmentIds:['aug-091','aug-101','aug-111']};
 const html=pveAugmentPopupMarkup(run);assert.equal((html.match(/data-action="pve-augment"/g)||[]).length,3);assert.match(html,/aria-hidden="true">◇/);
});
test('PVE-UI-18 Result overlay leads back to map and augment can layer above a passive result',async()=>{
 const run=projectRun(baseRun(),'p0');run.phase='ROOM_RESULT';
 const html=pveRoomResultOverlayMarkup(bundle(run),run);assert.match(html,/ROOM COMPLETE/);assert.match(html,/data-action="pve-map-open"/);
 const passive=pveRoomResultOverlayMarkup(bundle(run),run,{interactive:false});assert.doesNotMatch(passive,/data-action="pve-room-ready"/);assert.match(passive,/증강 선택 후/);
 const app=await readFile(new URL('../src/app.js',import.meta.url),'utf8');assert.match(app,/resumePhase==='ROOM_RESULT'.*interactive:false/s);
});
test('PVE-UI-19 Reward Room uses shared card selection, reveal and collision presentation',async()=>{
 const before=projectRun(baseRun(),'p0');before.phase='REWARD_ROOM';before.roomState={type:'REWARD_ROOM',attempt:1,publicCardCycles:{},readyPlayerIds:[]};
 const after=structuredClone(before);after.roomState.publicTurnResult={attempt:1,success:true,cards:[
  {playerId:'p0',finalNumber:2,valid:false,collisionImmune:false,collisionGroupSize:2,damage:0},
  {playerId:'p1',finalNumber:2,valid:false,collisionImmune:false,collisionGroupSize:2,damage:0}
 ]};
 const presentation=adaptPveRewardResult(before,after);
 assert.equal(presentation.key,'n1:1');assert.equal(presentation.cards.length,2);assert.equal(presentation.cards[0].valid,false);
 const source=await readFile(new URL('../src/app.js',import.meta.url),'utf8');
 assert.match(source,/scope=run\.phase==='REWARD_ROOM'\?'room'/);assert.match(source,/pve\.rewardSubmitCard/);assert.match(source,/mobileSelection\(mePlayer/);
 assert.match(source,/presentPveRewardAttempt/);assert.match(source,/renderPveRewardGameplay/);assert.match(source,/await reveal\(presentation\)/);
});
test('PVE-UI shared player adapter maps EXP, Run Gold, skills and used cards into competitive panel model',()=>{
 const run=projectRun(baseRun(),'p0'),players=pveGameplayPlayers(bundle(run),run);
 assert.equal(players.p0.score,4);assert.equal(players.p0.gold,2);assert.equal(players.p0.skillId,'amplify');
 assert.equal(players.p0.cycleCards[0].used,true);assert.equal(players.p0.cycleCards[1].used,false);
});

test('PVE preload marks local completion only after authoritative assets_loaded succeeds',async()=>{
 const source=await readFile(new URL('../src/app.js',import.meta.url),'utf8');
 const start=source.indexOf('async function preparePveEntry');
 const end=source.indexOf('function pveEncounterArt',start);
 const block=source.slice(start,end);
 assert.ok(block.indexOf("api.request('assets_loaded'")>=0);
 assert.ok(block.indexOf("api.request('assets_loaded'")<block.indexOf('pveEntryCompleted=run.id'));
 assert.match(block,/pveEntryCompleted=null;pveEntryError=error\.message/);
});
