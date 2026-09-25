import test from 'node:test';
import assert from 'node:assert/strict';
import {CHARACTER_CATALOG} from '../supabase/functions/game-api/characters.js';
import {createSession,createStageOrder,resolveTurn,openTurn,advanceAutomaticTurns,fillAutomaticSubmissions,roomReady} from '../supabase/functions/game-api/engine.js';
import {EVENT_RULES,ECHOES,validRhythm,beginEchoStage,giveEcho,activeEcho,eventResult,chooseRoomReward,echoList} from '../supabase/functions/game-api/room-remake.js';
import {roomSummaryMarkup} from '../src/room-summary.js';
const random=seed=>()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
function setup(){const m=Array.from({length:4},(_,i)=>({id:'p'+i,user_id:'u'+i,member_type:'human',character_id:'mage',seat_index:i,display_name:'Player '+i}));return {m,g:createSession('room',m,CHARACTER_CATALOG,random(3),2)};}
function stage(g,id,combat=false){g.state.currentStage={contentId:id,name:EVENT_RULES[id]?.[0]||id,rule:EVENT_RULES[id]?.[1]||'',category:combat?'monster':'event'};g.state.monster=combat?{id,hp:999,maxHp:999,attackIn:3}:null;g.state.stageTurn=0;beginEchoStage(g);}
function subs(g,values){return values.map((v,i)=>{const p=g.state.players['p'+i],c=p.cycleCards.find(c=>!c.used&&c.value===v);assert.ok(c);return {member_id:p.memberId,session_id:g.id,turn_index:g.turn_index,card_id:c.id,card_value:v};});}
function event(id,values){const {g}=setup();stage(g,id);const counts=values.reduce((a,v)=>(a[v]=(a[v]||0)+1,a),{});const cards=values.map((v,i)=>({memberId:'p'+i,value:v,effectValue:v,valid:counts[v]===1,clashed:counts[v]>1}));const changes={damage:[],heal:[],gold:[]};const success=eventResult(g,cards,{damage:(id,n)=>changes.damage.push([id,n]),heal:(id,n)=>changes.heal.push([id,n]),gold:(id,n)=>changes.gold.push([id,n]),rng:()=>0});return {g,success,...changes};}
test('2000 constrained dungeons keep exact counts and never produce three same-family rooms, including boss',()=>{
 let doubles=0;for(let seed=1;seed<=2000;seed++){const order=createStageOrder(random(seed));assert.ok(validRhythm(order));assert.equal(order.filter(s=>s.category==='monster').length,4);assert.equal(order.filter(s=>!['monster','boss'].includes(s.category)).length,5);assert.equal(order.at(-1).category,'boss');if(order.some((s,i)=>i&&s.category===order[i-1].category))doubles++;}assert.ok(doubles>0);
});
test('all sixteen events implement the new small immediate rewards and echoes',()=>{
 assert.equal(Object.keys(EVENT_RULES).length,16);
 let r=event('pressure_plate',[1,2,3,4]);assert.equal(r.gold.length,4);assert.equal(r.g.state.echo.id,'footsteps');assert.equal(event('pressure_plate',[1,1,2,2]).damage.length,1);
 r=event('overload_device',[1,1,2,2]);assert.equal(r.g.state.echo.id,'power');r=event('overload_device',[2,3,4,5]);assert.deepEqual(r.damage,[['p3',1]]);assert.equal(r.gold.length,4);
 r=event('twin_statues',[1,1,2,3]);assert.equal(r.g.state.echo.id,'twins');r=event('twin_statues',[1,2,3,4]);assert.deepEqual(r.damage,[['p3',1],['p0',1]]);
 r=event('collapsing_bridge',[1,2,3,4]);assert.equal(r.g.state.personalEchoes.p0.id,'lead');assert.equal(r.damage[0][0],'p1');
 for(const [id,echo,target,amount] of [['greedy_chest','greed','p3',6],['humble_chest','humility','p0',2],['cursed_safe','curse','p3',6],['suspicious_offer','doubt','p0',2]]){r=event(id,[1,2,3,4]);assert.deepEqual(r.gold,[[target,amount]]);assert.equal(r.g.state.echo.id,echo);}
 r=event('balance_vault',[1,2,3,4]);assert.equal(r.gold.length,4);assert.equal(r.g.state.echo.id,'balance');assert.deepEqual(event('balance_vault',[1,1,2,3]).gold,[['p3',2]]);
 r=event('healing_spring',[1,2,3,4]);assert.deepEqual(r.heal,[['p0',1]]);assert.equal(r.g.state.echo.id,'clarity');
 r=event('shared_supplies',[1,2,3,4]);assert.equal(r.heal.length,2);assert.equal(r.g.state.echo.id,'hearty');assert.equal(event('shared_supplies',[1,1,3,4]).heal.length,1);assert.equal(event('shared_supplies',[1,1,2,2]).heal.length,0);
 r=event('field_clinic',[1,2,3,4]);assert.deepEqual(r.heal,[['p3',1],['p0',1]]);
 r=event('suspicious_merchant',[1,2,3,5]);assert.deepEqual(Object.values(r.g.state.roomChoices).map(x=>x.item),['map','map','dice','shield']);
 r=event('gamblers_altar',[1,1,3,4]);assert.deepEqual(Object.keys(r.g.state.roomChoices),['p2']);
 r=event('ancient_gate',[1,1,3,4]);assert.ok(r.success);for(const o of r.g.state.gateOptions){assert.ok(validRhythm(o.order));assert.equal(o.order.length,10);}
 r=event('truce_offer',[1,2,3,4]);assert.equal(r.gold.length,4);assert.equal(r.g.state.echo.id,'truce');assert.equal(event('truce_offer',[1,1,3,4]).damage.length,0);
});
test('room summary persists until everyone readies, AI readies immediately and retries do not advance twice',()=>{
 const {g,m}=setup();m[3].member_type='ai';stage(g,'pressure_plate');const submissions=subs(g,[1,2,3,4]);advanceAutomaticTurns(g,m,submissions,()=>0);
 assert.equal(g.stage_index,1);assert.deepEqual(g.state.roomSummary.ready,['p3']);assert.equal(g.state.roomSummary.deltas.p0.gold,2);
 assert.deepEqual(openTurn(g,m),[]);assert.throws(()=>resolveTurn(g,subs(g,[2,1,4,3])),/준비/);
 for(const id of ['p0','p1'])roomReady(g,id,1);assert.deepEqual(advanceAutomaticTurns(g,m,submissions),[]);assert.equal(g.stage_index,1);
 roomReady(g,'p2',1);advanceAutomaticTurns(g,m,submissions,()=>0);assert.equal(g.stage_index,2);assert.equal(g.state.roomSummary,undefined);assert.equal(roomReady(g,'p2',1),false);
});
test('power restores duplicate actions for one turn and first clash clarity waits until needed',()=>{
 for(const id of ['power','clarity']){const {g}=setup();giveEcho(g,id);g.stage_index=2;stage(g,'armored_boar',true);const r=resolveTurn(g,subs(g,[1,1,2,3]));assert.ok(r.cards.every(c=>c.valid));assert.equal(r.totalDamage,7);assert.ok(!g.state.echo);assert.ok(g.state.echoLog.some(e=>e.status==='발동'));}
 const {g}=setup();giveEcho(g,'clarity');g.stage_index=2;stage(g,'armored_boar',true);resolveTurn(g,subs(g,[1,2,3,4]));assert.ok(activeEcho(g,'clarity'));
});
test('countdown echoes, target reduction and personal shielding are single-use',()=>{
 for(const [id,values,want] of [['footsteps',[1,2,3,4],3],['truce',[1,2,3,4],3],['twins',[1,1,2,3],3],['balance',[1,1,2,3],3],['curse',[1,1,2,3],1]]){const {g}=setup();giveEcho(g,id);g.stage_index=2;stage(g,'armored_boar',true);resolveTurn(g,subs(g,values));assert.equal(g.state.monster.attackIn,want,id);assert.ok(!g.state.echo);}
 for(const id of ['hearty','shield']){const {g}=setup();giveEcho(g,id,id==='shield'?'p3':null);g.stage_index=2;stage(g,'armored_boar',true);g.state.monster.attackIn=1;const r=resolveTurn(g,subs(g,[1,2,3,4]));assert.ok(!r.effects.some(e=>e.type==='damage'));assert.equal(echoList(g.state).length,0);}
});
test('pending echoes survive unrelated rooms, expire at matching room end and bets pay only survivors',()=>{
 const {g}=setup();giveEcho(g,'footsteps');g.stage_index=2;stage(g,'field_clinic');resolveTurn(g,subs(g,[1,2,3,4]));assert.equal(g.state.echo.id,'footsteps');
 for(const knockedOut of [false,true]){const {g}=setup();giveEcho(g,'bet','p0');g.stage_index=2;stage(g,'armored_boar',true);g.state.monster.hp=1;g.state.players.p0.knockedOut=knockedOut;g.state.players.p0.hp=knockedOut?0:3;const r=resolveTurn(g,subs(g,[1,2,3,4]));const bet=r.effects.filter(e=>e.reason==='bet');assert.equal(bet.length,1);assert.equal(echoList(g.state).length,0);}
});
test('reward choices debit once, block insufficient gold, and keep one personal echo',()=>{
 const {g}=setup();stage(g,'suspicious_merchant');resolveTurn(g,subs(g,[1,2,3,4]));assert.throws(()=>chooseRoomReward(g,'p0','buy'),/부족/);g.state.players.p0.gold=5;
 assert.equal(chooseRoomReward(g,'p0','buy'),true);assert.equal(chooseRoomReward(g,'p0','buy'),false);assert.equal(g.state.players.p0.gold,4);assert.equal(g.state.personalEchoes.p0.id,'map');assert.equal(g.state.roomSummary.deltas.p0.gold,4);
 giveEcho(g,'shield','p0');assert.equal(Object.keys(g.state.personalEchoes).length,1);
});
test('receipt has four portraits, compact deltas, ready controls and separate echo details',()=>{
 const {g,m}=setup();stage(g,'pressure_plate');resolveTurn(g,subs(g,[1,2,3,4]));const html=roomSummaryMarkup({session:g,members:m},m[0],true);assert.equal((html.match(/summary-portrait/g)||[]).length,4);assert.match(html,/room-ready/);assert.match(html,/data-summary-details/);assert.ok(!html.includes('>'+ECHOES.footsteps[2]+'<'));assert.match(html,/title=/);
});

test('100 remade expeditions with AI, choices and receipts terminate without stale echoes or stalled rooms',()=>{
 for(let seed=1;seed<=100;seed++){
  const rng=random(seed),{g,m}=setup();m.slice(1).forEach(x=>{x.member_type='ai';x.ai_type='balanced';});let submissions=openTurn(g,m,rng),steps=0;
  while((g.status==='active'||g.state.roomSummary)&&steps++<500){
   const s=g.state;
   if(s.roomSummary){
    const offer=s.roomChoices.p0;if(offer&&!s.roomSummary.decisions.p0)chooseRoomReward(g,'p0',offer.kind==='shop'?(s.players.p0.gold>=offer.price?'buy':'skip'):(rng()<.5?'cash':'bet'));
    else if(s.gateOptions?.length&&!s.roomSummary.decisions.p0)chooseRoomReward(g,'p0',s.gateOptions[0].kind);
    roomReady(g,'p0',g.stage_index);advanceAutomaticTurns(g,m,submissions,rng);
   }else{
    if(!submissions.some(x=>x.turn_index===g.turn_index&&x.member_id==='p0')){const p=s.players.p0,c=p.cycleCards.filter(c=>!c.used)[0];submissions.push({session_id:g.id,turn_index:g.turn_index,member_id:'p0',card_id:c.id,card_value:c.value});}
    // A simulated human keeps its first selection; API reselection is tested separately.
    for(const id of Object.keys(s.selectionHolds||{}))delete s.selectionHolds[id];
    fillAutomaticSubmissions(g,m,submissions,rng);advanceAutomaticTurns(g,m,submissions,rng);
   }
   assert.ok(echoList(s).length<=5);assert.ok(validRhythm(s.stageOrder));assert.ok(g.party_knockouts<=8);
  }
  assert.ok(steps<500,'stalled seed '+seed+JSON.stringify({turn:g.turn_index,stage:g.stage_index,summary:g.state.roomSummary,locks:g.state.lockedMembers,holds:g.state.selectionHolds,sub:submissions.filter(x=>x.turn_index===g.turn_index).map(x=>x.member_id),hp:g.state.monster?.hp}));assert.ok(['completed','failed'].includes(g.status));
 }
});
test('lead and dice apply only to the matching room, hold human resolution, and expire with that room',()=>{
 for(const id of ['lead','dice']){
  const {g,m}=setup();giveEcho(g,id,'p0');g.stage_index=2;stage(g,id==='lead'?'armored_boar':'pressure_plate',id==='lead');
  const automatic=openTurn(g,m);assert.equal(g.state.selectionHolds.p0,id);assert.deepEqual(automatic,[]);
  const submitted=subs(g,[1,2,3,4]);assert.deepEqual(advanceAutomaticTurns(g,m,submitted),[]);assert.equal(g.turn_index,1);
  delete g.state.selectionHolds.p0;advanceAutomaticTurns(g,m,submitted);assert.equal(g.turn_index,2);assert.equal(g.state.personalEchoes.p0,undefined);
 }
});

test('boss result waits for human readiness and then completes without creating an eleventh room',()=>{
 const {g,m}=setup();m.slice(1).forEach(x=>x.member_type='ai');g.stage_index=10;stage(g,'armored_boar',true);g.state.currentStage.category='boss';g.state.monster.hp=1;
 const submissions=subs(g,[1,2,3,4]);advanceAutomaticTurns(g,m,submissions);assert.equal(g.status,'completed');assert.equal(g.state.roomSummary.ready.length,3);
 roomReady(g,'p0',10);advanceAutomaticTurns(g,m,submissions);assert.equal(g.state.roomSummary,undefined);assert.equal(g.stage_index,10);
});
test('departed human becoming AI cannot hold the party at the receipt',()=>{
 const {g,m}=setup();stage(g,'pressure_plate');const submissions=subs(g,[1,2,3,4]);advanceAutomaticTurns(g,m,submissions);
 for(const id of ['p0','p1','p2'])roomReady(g,id,1);m[3].member_type='ai';advanceAutomaticTurns(g,m,submissions);assert.equal(g.stage_index,2);assert.ok(!g.state.roomSummary);
});
