import test from 'node:test';
import assert from 'node:assert/strict';
import {newPlayerRunState,newCombatState} from '../supabase/functions/game-api/pve/model.js';
import {beginTurn,submitCard,resolveBasicTurn} from '../supabase/functions/game-api/pve/combat.js';
import {installRelicCatalog} from '../supabase/functions/game-api/pve/relics.js';
import {applyEffectDefinitions} from '../supabase/functions/game-api/pve/effects.js';
import {
  enterRestRoom,applyRestChoice,enterShopRoom,reserveShopCard,cancelShopCardReservation,confirmShopCard,buyShopRelic,finishShop,
  enterRewardRoom,submitRewardCard,resolveRewardAttempt,chooseRewardRelic,roomReady
} from '../supabase/functions/game-api/pve/rooms.js';
import {projectRun} from '../supabase/functions/game-api/pve/projection.js';

function members(ids=['adventurer','adventurer','adventurer','adventurer'],ai=[]){
  return ids.map((character_id,i)=>({id:`p${i}`,user_id:ai.includes(i)?null:`u${i}`,member_type:ai.includes(i)?'ai':'human',character_id,seat_index:i}));
}
function makeRun(ids,opts={}){
  const players=members(ids,opts.ai||[]).map(newPlayerRunState);
  const run={id:'run-009010',roomId:'room',seed:opts.seed||'seed-009010',rngCounter:0,version:0,phase:'COMBAT',floor:1,depth:1,flame:opts.flame??3,maxFlame:5,map:{nodes:[],edges:{},votes:{}},currentRoomNodeId:opts.node||'node-x',players,createdAt:'x',updatedAt:'x',combat:newCombatState(players,opts.hp||200)};
  beginTurn(run);return run;
}
function cardByNumber(run,pid,n){
  const p=run.players.find(x=>x.playerId===pid),priv=run.combat.privateByPlayer[pid];
  return p.cardPool.find(c=>c.baseNumber===n&&priv.remainingCardIds.includes(c.id))?.id;
}
function submitNumbers(run,values){
  values.forEach((n,i)=>submitCard(run,`p${i}`,cardByNumber(run,`p${i}`,n)));
  return resolveBasicTurn(run);
}
function fixtureRelics(){
  const general=Array.from({length:8},(_,i)=>({id:`fixture-g-${i+1}`,name:`Fixture General ${i+1}`,pool:'GENERAL',betaPrice:4,effects:[]}));
  const shop=Array.from({length:4},(_,i)=>({id:`fixture-s-${i+1}`,name:`Fixture Shop ${i+1}`,pool:'SHOP_EXCLUSIVE',betaPrice:5,effects:[]}));
  return [...general,...shop];
}
function rewardCard(run,pid,n){
  const p=run.players.find(x=>x.playerId===pid),st=run.roomState.privateByPlayer[pid];
  return p.cardPool.find(c=>c.baseNumber===n&&st.remainingCardIds.includes(c.id))?.id;
}
function submitRewardNumbers(run,values){
  values.forEach((n,i)=>submitRewardCard(run,`p${i}`,rewardCard(run,`p${i}`,n)));
  return resolveRewardAttempt(run);
}

test('PVE-009 number engraving changes valid damage only and never collision grouping',()=>{
  const run=makeRun();run.players[0].engravings['2']=2;
  let result=submitNumbers(run,[2,1,3,4]);
  assert.equal(result.cards[0].finalNumber,2);
  assert.equal(result.damagePackets.find(x=>x.sourcePlayerId==='p0').amount,4);
  assert.equal(result.totalDamage,12);

  const clash=makeRun();clash.players[0].engravings['2']=5;
  result=submitNumbers(clash,[2,2,3,4]);
  assert.equal(result.cards[0].valid,false);assert.equal(result.cards[1].valid,false);
  assert.equal(result.damagePackets.some(x=>x.sourcePlayerId==='p0'),false);
  assert.equal(result.totalDamage,7);
});

test('PVE-009 effect engine honors priority, maxTriggers, TURN reset, conditions, and follow-up repetition tags',()=>{
  const run=makeRun(),p=run.players[0],damage={amount:1};
  const defs=[
    {id:'set',trigger:'BEFORE_DAMAGE',priority:10,operations:[{type:'SET_DAMAGE',amount:5}]},
    {id:'plus',trigger:'BEFORE_DAMAGE',priority:20,maxTriggers:1,resetScope:'TURN',condition:{path:'player.hp',gte:3},operations:[{type:'MODIFY_DAMAGE',amount:2}]},
  ];
  applyEffectDefinitions(run,p,defs,'BEFORE_DAMAGE',{damage,followUp:false,events:[]});
  assert.equal(damage.amount,7);
  const again={amount:1};applyEffectDefinitions(run,p,defs,'BEFORE_DAMAGE',{damage:again,followUp:false,events:[]});
  assert.equal(again.amount,5);
  run.combat.turn++;
  const next={amount:1};applyEffectDefinitions(run,p,defs,'BEFORE_DAMAGE',{damage:next,followUp:false,events:[]});
  assert.equal(next.amount,7);

  const ordinary={id:'ordinary',trigger:'BEFORE_DAMAGE',priority:1,operations:[{type:'MODIFY_DAMAGE',amount:10}]};
  const multi={id:'multi',trigger:'BEFORE_DAMAGE',priority:2,tags:['MULTI_HIT'],operations:[{type:'MODIFY_DAMAGE',amount:1}]};
  const follow={amount:2};applyEffectDefinitions(run,p,[ordinary,multi],'BEFORE_DAMAGE',{damage:follow,followUp:true,events:[]});
  assert.equal(follow.amount,3);
});

test('PVE-009 owned relic effects are reused by combat and armor absorbs monster damage',()=>{
  const run=makeRun(undefined,{hp:100}),p=run.players[0];
  const catalog=[
    {id:'fixture-damage',name:'Damage fixture',pool:'GENERAL',effects:[{id:'fx-dmg',trigger:'BEFORE_DAMAGE',priority:1,operations:[{type:'MODIFY_DAMAGE',amount:2}]}]},
    {id:'fixture-armor',name:'Armor fixture',pool:'GENERAL',effects:[{id:'fx-arm',trigger:'TURN_START',priority:1,maxTriggers:1,resetScope:'TURN',operations:[{type:'ADD_ARMOR',amount:1}]}]},
  ];
  installRelicCatalog(run,catalog);p.relics.push('fixture-damage','fixture-armor');
  // beginTurn happened before relic install; explicitly begin a fresh turn so TURN_START armor triggers.
  run.combat.turn+=1;beginTurn(run);
  assert.equal(p.publicResources.armor,1);
  run.combat.monster.intent={type:'DIRECT_DAMAGE',telegraphText:'fixture',payload:{targetPlayerId:'p0',amount:1}};
  const result=submitNumbers(run,[1,2,3,4]);
  assert.equal(result.damagePackets.find(x=>x.sourcePlayerId==='p0').amount,3);
  assert.equal(p.hp,3);
  // Monster damage consumed the current armor, then the automatically opened next turn granted 1 armor again.
  assert.equal(p.publicResources.armor,1);
  assert.ok(result.events.some(e=>e.type==='PLAYER_DAMAGED'&&e.playerId==='p0'&&e.blocked===1&&e.amount===0));
});

test('PVE-009 card operation framework can recover a physical spent instance in non-combat private state',()=>{
  const run=makeRun(),p=run.players[0],state={playerId:'p0',cycleIndex:1,spentCardIds:[p.cardPool[0].id],remainingCardIds:p.cardPool.slice(1).map(c=>c.id)};
  const events=[];
  applyEffectDefinitions(run,p,[{id:'recover',trigger:'ROOM_END',priority:1,operations:[{type:'RECOVER_CARD'}]}],'ROOM_END',{privateState:state,events});
  assert.equal(state.spentCardIds.length,0);assert.ok(state.remainingCardIds.includes(p.cardPool[0].id));
  assert.equal(events[0].type,'PRIVATE_CARD_RECOVERED');
});

test('PVE-010 rest choices are independent: full heal, capped flame, and number engraving all resolve once',()=>{
  const run=makeRun();delete run.combat;run.players[0].hp=1;run.flame=4;run.currentRoomNodeId='rest';
  enterRestRoom(run);assert.equal(run.phase,'REST');
  applyRestChoice(run,'p0','FULL_HEAL');
  applyRestChoice(run,'p1','FLAME');
  applyRestChoice(run,'p2','ENGRAVE',6);
  applyRestChoice(run,'p3','FLAME');
  assert.equal(run.players[0].hp,3);assert.equal(run.flame,5);assert.equal(run.players[2].engravings['6'],1);
  assert.equal(run.phase,'ROOM_RESULT');
  assert.throws(()=>applyRestChoice(run,'p0','FULL_HEAL'));
});

test('PVE-010 shop creates four card slots and 2+2 relic stock; reservation excludes rivals and expires after 20 seconds',()=>{
  const run=makeRun();delete run.combat;run.currentRoomNodeId='shop';installRelicCatalog(run,fixtureRelics());for(const p of run.players)p.runGold=20;
  enterShopRoom(run);
  assert.equal(run.phase,'SHOP');assert.equal(run.roomState.cardStock.length,4);assert.equal(run.roomState.relicStock.length,4);
  assert.equal(run.roomState.relicStock.filter(x=>x.pool==='GENERAL').length,2);
  assert.equal(run.roomState.relicStock.filter(x=>x.pool==='SHOP_EXCLUSIVE').length,2);
  const item=run.roomState.cardStock[0];
  reserveShopCard(run,'p0',item.id,1_000);
  assert.throws(()=>reserveShopCard(run,'p1',item.id,2_000),/예약/);
  reserveShopCard(run,'p1',item.id,21_001);
  assert.equal(item.reservedByPlayerId,'p1');
  assert.equal(cancelShopCardReservation(run,'p1',item.id),true);
});

test('PVE-010 confirming a reserved card atomically replaces one physical card and spends run gold; sold stock cannot sell twice',()=>{
  const run=makeRun();delete run.combat;run.currentRoomNodeId='shop';installRelicCatalog(run,fixtureRelics());run.players[0].runGold=20;run.players[1].runGold=20;
  enterShopRoom(run);
  const item=run.roomState.cardStock[0],old=run.players[0].cardPool[0],before=run.players[0].runGold;
  reserveShopCard(run,'p0',item.id,100);
  confirmShopCard(run,'p0',item.id,old.id,200);
  assert.equal(run.players[0].runGold,before-item.price);assert.equal(run.players[0].cardPool.some(c=>c.id===old.id),false);
  assert.equal(run.players[0].cardPool.some(c=>c.source==='SHOP'&&c.baseNumber===item.value),true);
  assert.equal(item.sold,true);
  assert.throws(()=>reserveShopCard(run,'p1',item.id,300),/구매/);
});

test('PVE-010 relic shop uses run gold, forbids duplicate ownership, and shared stock is consumed once',()=>{
  const run=makeRun();delete run.combat;run.currentRoomNodeId='shop';installRelicCatalog(run,fixtureRelics());for(const p of run.players)p.runGold=20;
  enterShopRoom(run);
  const item=run.roomState.relicStock[0];run.players[0].relics.push(item.relicId);
  assert.throws(()=>buyShopRelic(run,'p0',item.id),/중복/);
  const other=run.roomState.relicStock[1],gold=run.players[1].runGold;
  buyShopRelic(run,'p1',other.id);assert.equal(run.players[1].runGold,gold-other.price);assert.ok(run.players[1].relics.includes(other.relicId));
  assert.throws(()=>buyShopRelic(run,'p2',other.id),/구매/);
});

test('PVE-010 reward room ranks valid players by final damage and gives each valid player first choice before completion',()=>{
  const run=makeRun();delete run.combat;run.currentRoomNodeId='reward';installRelicCatalog(run,fixtureRelics());
  enterRewardRoom(run);const r=submitRewardNumbers(run,[1,2,3,4]);
  assert.deepEqual(r.pickOrder,['p3','p2','p1','p0']);
  for(const pid of ['p3','p2','p1','p0']){const id=run.roomState.relicIds[0];chooseRewardRelic(run,pid,id);}
  assert.equal(run.phase,'ROOM_RESULT');
  for(const p of run.players)assert.equal(p.relics.length,1);
});

test('PVE-010 reward room preserves consumed cards across all-collision retries and auto-opens on the third collision',()=>{
  const run=makeRun();delete run.combat;run.currentRoomNodeId='reward';installRelicCatalog(run,fixtureRelics());
  enterRewardRoom(run);
  let r=submitRewardNumbers(run,[1,1,1,1]);assert.equal(r.retry,true);assert.equal(run.roomState.attempt,2);
  r=submitRewardNumbers(run,[2,2,2,2]);assert.equal(r.retry,true);assert.equal(run.roomState.attempt,3);
  r=submitRewardNumbers(run,[3,3,3,3]);assert.equal(r.autoOpened,true);assert.equal(run.phase,'ROOM_RESULT');
  for(const pid of ['p0','p1','p2','p3'])assert.deepEqual(run.roomState.privateByPlayer[pid].spentCardIds.length,3);
  for(const p of run.players)assert.equal(p.relics.length,1);
});

test('PVE-010 reward room preserves Mage skill_data selected by the shared Gameplay UI',()=>{
  const run=makeRun(['mage','adventurer','adventurer','adventurer']);delete run.combat;run.currentRoomNodeId='reward';installRelicCatalog(run,fixtureRelics());
  enterRewardRoom(run);run.players[0].publicResources.mana=4;
  submitRewardCard(run,'p0',rewardCard(run,'p0',1),true,{manaSpend:2});
  assert.deepEqual(run.roomState.turnSubmissions.p0.skillData,{manaSpend:2});
  submitRewardCard(run,'p1',rewardCard(run,'p1',4));
  submitRewardCard(run,'p2',rewardCard(run,'p2',3));
  submitRewardCard(run,'p3',rewardCard(run,'p3',5));
  const result=resolveRewardAttempt(run),mage=result.cards.find(card=>card.playerId==='p0');
  assert.equal(mage.finalNumber,2);assert.equal(run.players[0].publicResources.mana,2);

  const reverse=makeRun(['mage','adventurer','adventurer','adventurer']);delete reverse.combat;reverse.currentRoomNodeId='reward';installRelicCatalog(reverse,fixtureRelics());
  reverse.players[0].augments.push('aug-111');enterRewardRoom(reverse);reverse.players[0].publicResources.mana=2;
  submitRewardCard(reverse,'p0',rewardCard(reverse,'p0',1),true,{direction:-1,manaSpend:2});
  submitRewardCard(reverse,'p1',rewardCard(reverse,'p1',2));
  submitRewardCard(reverse,'p2',rewardCard(reverse,'p2',3));
  submitRewardCard(reverse,'p3',rewardCard(reverse,'p3',4));
  const reverseResult=resolveRewardAttempt(reverse),reverseMage=reverseResult.cards.find(card=>card.playerId==='p0');
  assert.equal(reverseMage.finalNumber,0);assert.equal(reverse.players[0].publicResources.mana,0);
});

test('PVE-010 reward retry keeps active-skill resource consumption instead of refunding it',()=>{
  const run=makeRun(['mage','adventurer','adventurer','adventurer']);delete run.combat;run.currentRoomNodeId='reward';installRelicCatalog(run,fixtureRelics());
  enterRewardRoom(run);run.players[0].publicResources.mana=2;
  submitRewardCard(run,'p0',rewardCard(run,'p0',1),true);
  submitRewardCard(run,'p1',rewardCard(run,'p1',2));
  submitRewardCard(run,'p2',rewardCard(run,'p2',3));
  submitRewardCard(run,'p3',rewardCard(run,'p3',3));
  const r=resolveRewardAttempt(run);
  assert.equal(r.retry,true);assert.equal(run.roomState.attempt,2);
  // Amplify spent 2 -> 0; opening the retry turn grants only the normal +1 mana.
  assert.equal(run.players[0].publicResources.mana,1);
  assert.equal(run.roomState.privateByPlayer.p0.spentCardIds.length,1);
});

test('PVE-010 reward private cycle state is viewer-only and roomReady returns completed rooms to map voting',()=>{
  const run=makeRun();delete run.combat;run.currentRoomNodeId='reward';installRelicCatalog(run,fixtureRelics());enterRewardRoom(run);
  submitRewardCard(run,'p1',rewardCard(run,'p1',2));
  const view=projectRun(run,'p0'),raw=JSON.stringify(view);
  assert.equal(raw.includes('privateByPlayer'),false);assert.equal(raw.includes(run.players[1].cardPool[1].id),false);
  assert.equal(view.privateRoomState.playerId,'p0');assert.deepEqual(view.roomState.readyPlayerIds,['p1']);

  // Complete a room-result flow and require all humans to acknowledge.
  run.phase='ROOM_RESULT';run.roomResult={roomNodeId:'reward',readyPlayerIds:[]};
  roomReady(run,'p0',1000);roomReady(run,'p1',1000);roomReady(run,'p2',1000);assert.equal(run.phase,'ROOM_RESULT');
  roomReady(run,'p3',1000);assert.equal(run.phase,'MAP_VOTE');assert.equal(run.map.voteDeadline,new Date(16_000).toISOString());
});

test('PVE-010 missing production relic content never fabricates relics and does not deadlock reward resolution',()=>{
  const run=makeRun();delete run.combat;run.currentRoomNodeId='reward';
  enterRewardRoom(run);assert.equal(run.roomState.catalogIncomplete,true);assert.deepEqual(run.roomState.relicIds,[]);
  const r=submitRewardNumbers(run,[1,2,3,4]);
  assert.equal(r.catalogIncomplete,true);assert.equal(run.phase,'ROOM_RESULT');
  assert.ok(run.players.every(p=>p.relics.length===0));
});
