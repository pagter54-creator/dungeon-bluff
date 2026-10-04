import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {newPlayerRunState,newCombatState} from '../supabase/functions/game-api/pve/model.js';
import {beginTurn,submitCard,resolveBasicTurn} from '../supabase/functions/game-api/pve/combat.js';
import {projectRun} from '../supabase/functions/game-api/pve/projection.js';
import {dueAugmentTiers,AUGMENT_THRESHOLDS} from '../supabase/functions/game-api/pve/augments.js';
import {reserveShopCard} from '../supabase/functions/game-api/pve/rooms.js';
import {patternPanelMarkup} from '../src/pve-combat-presentation.js';
import {sharedEncounterMarkup} from '../src/shared-gameplay-ui.js';
import {pveShopMarkup,pveShopPurchaseIssue,pveRestActionsMarkup,pveTerminalMarkup} from '../src/pve-roguelike-ui.js';

function runFor(classes=['mage','mage','mage','mage']){
 const players=classes.map((character_id,i)=>newPlayerRunState({id:'p'+i,user_id:'u'+i,seat_index:i,member_type:'human',character_id}));
 const run={id:'compact-growth',seed:'growth',rngCounter:0,version:0,phase:'COMBAT',floor:1,depth:1,currentRoomNodeId:'n',flame:5,maxFlame:5,players};
 run.combat=newCombatState(players,200);beginTurn(run);return run;
}
function play(run,values,skill=false){
 values.forEach((n,i)=>submitCard(run,'p'+i,run.players[i].cardPool.find(c=>c.baseNumber===n).id,i===0&&skill));
 return resolveBasicTurn(run);
}
test('every valid final attack awards matching damage EXP before a kill; invalid cards award zero',()=>{
 const run=runFor(),result=play(run,[1,2,2,4]);
 assert.ok(run.combat.monster.hp>0);
 assert.deepEqual(run.players.map(p=>p.growthExp),[1,0,0,4]);
 assert.equal(result.events.filter(e=>e.source==='COMBAT_DAMAGE').reduce((n,e)=>n+e.amount,0),result.totalDamage);
 const before=run.players.map(p=>p.growthExp);
 assert.equal(resolveBasicTurn(run),null);assert.deepEqual(run.players.map(p=>p.growthExp),before);
 assert.equal(projectRun(structuredClone(run),'p0').players[0].growthExp,1);
});
test('blocked damage grants no combat EXP',()=>{
 const run=runFor();run.combat.monster.defense=100;const result=play(run,[1,2,3,4]);
 assert.equal(result.totalDamage,0);assert.deepEqual(run.players.map(p=>p.growthExp),[0,0,0,0]);
});
test('Full Burst grants primary and remaining card damage exactly once',()=>{
 const run=runFor(['gunner','mage','mage','mage']),result=play(run,[2,1,3,4],true);
 const packets=result.damagePackets.filter(p=>p.sourcePlayerId==='p0');
 assert.ok(packets.some(p=>p.followUp));assert.equal(run.players[0].growthExp,packets.reduce((n,p)=>n+p.amount,0));
 assert.equal(result.events.filter(e=>e.source==='COMBAT_DAMAGE'&&e.playerId==='p0').length,1);
});
test('damage EXP uses existing thresholds and waits for the existing combat-end choice window',()=>{
 const run=runFor();run.players[0].growthExp=49;play(run,[2,1,3,4]);
 assert.equal(run.players[0].growthExp,51);assert.deepEqual(AUGMENT_THRESHOLDS,[50,150,350,750]);
 assert.ok(dueAugmentTiers(run.players[0]).includes(1));assert.equal(run.phase,'COMBAT');assert.ok(!run.augmentChoice);
});
test('pattern replaces the existing intent inside the encounter; competitive fallback remains',async()=>{
 const markup=patternPanelMarkup({id:'f1_coward_hunter',name:'사냥꾼',ruleSummary:'<조건>',presentation:{statusText:'진행 1/3'},intent:{payload:{targetPlayerId:'p0'}}},[{playerId:'p0',seat:0}]);
 const html=sharedEncounterMarkup({monster:{hp:20,maxHp:20},intentMarkup:markup});
 assert.equal((html.match(/pve-pattern-panel/g)||[]).length,1);
 assert.ok(html.indexOf('pve-pattern-panel')<html.lastIndexOf('</section>'));
 assert.match(html,/class="intent pve-pattern-panel"/);assert.match(html,/1번 자리/);assert.match(html,/진행 1\/3/);assert.match(html,/&lt;조건&gt;/);
 assert.match(sharedEncounterMarkup({intentText:'일반 규칙'}),/일반 규칙/);
 const app=await readFile(new URL('../src/app.js',import.meta.url),'utf8');
 assert.ok(!app.includes('})+patternPanelMarkup'));assert.ok(app.includes('intentMarkup:patternPanelMarkup(monster,run.players)'));
 assert.ok(app.includes('+combatControls+pveRelicStripMarkup(bundle,run)'));
});
test('shop shortage appears in product listing and is guarded before confirmation',async()=>{
 const run=runFor();run.phase='SHOP';run.players[0].runGold=1;run.roomState={type:'SHOP',readyPlayerIds:[],cardStock:[{id:'c',kind:'CARD',value:6,price:4,sold:false}],relicStock:[]};
 const item=run.roomState.cardStock[0];
 assert.equal(pveShopPurchaseIssue(run,item,'p0'),'골드가 부족합니다.');
 assert.match(pveShopMarkup(run,{playerId:'p0'}),/골드가 부족합니다\./);
 assert.throws(()=>reserveShopCard(run,'p0','c'),/골드가 부족/);assert.ok(!item.reservedByPlayerId);
 run.players[0].runGold=4;assert.equal(pveShopPurchaseIssue(run,item,'p0'),'');reserveShopCard(run,'p0','c');
 assert.equal(item.reservedByPlayerId,'p0');
 const app=await readFile(new URL('../src/app.js',import.meta.url),'utf8');
 const handler=app.slice(app.indexOf("if(action==='pve-shop-item')"),app.indexOf("if(action==='pve-shop-reserve')"));
 assert.ok(handler.indexOf('pveShopPurchaseIssue')<handler.indexOf('showModal'));
});
test('shop affordability uses projected owner discount without consuming it',()=>{
 const run=runFor(['adventurer','mage','mage','mage']);run.phase='SHOP';run.players[0].runGold=3;
 run.roomState={type:'SHOP',readyPlayerIds:[],cardStock:[{id:'c',kind:'CARD',value:6,price:4,sold:false}],relicStock:[]};
 run.augmentFramework={statuses:[],cardState:{'p0:ad:shopDiscount':{ready:true}}};
 const view=projectRun(run,'p0');assert.equal(view.roomState.cardStock[0].price,3);
 assert.equal(pveShopPurchaseIssue(view,view.roomState.cardStock[0],'p0'),'');
 reserveShopCard(run,'p0','c');assert.equal(run.augmentFramework.cardState['p0:ad:shopDiscount'].ready,true);
});
test('rest and final summary display the unified Korean flame label',()=>{
 const run=runFor();assert.match(pveRestActionsMarkup(run),/불씨 \+1/);
 assert.match(pveTerminalMarkup({},run,run.players[0]),/불씨 <b>/);
});
