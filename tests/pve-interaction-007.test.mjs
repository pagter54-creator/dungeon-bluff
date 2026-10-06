import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createPveMapViewport} from '../src/pve-map-viewport.js';
import {pveMageLimits,pveMageChoices,pveAmplifyCost,pveResourceBadges,pveResourceBadgesMarkup} from '../src/pve-resource-ui.js';
import {pveGameplayPlayers} from '../src/pve-gameplay-adapter.js';
import {sharedEncounterMarkup} from '../src/shared-gameplay-ui.js';
import {newPlayerRunState,newCombatState} from '../supabase/functions/game-api/pve/model.js';
import {beginTurn,submitCard} from '../supabase/functions/game-api/pve/combat.js';
import {projectRun} from '../supabase/functions/game-api/pve/projection.js';
import {enterEventRoom} from '../supabase/functions/game-api/pve/events.js';
import {freshGamblerState,prepareGamblerAllIn,finalizeGamblerAllIn} from '../supabase/functions/game-api/pve/gambler.js';
const player=(id,characterId)=>newPlayerRunState({id,user_id:'u'+id,character_id:characterId,member_type:'human',seat_index:0});
function runOf(players){return {id:'r',seed:'reset-event-7',rngCounter:0,phase:'COMBAT',floor:1,depth:1,currentRoomNodeId:'node',players,usedEventIds:[],flame:4,maxFlame:5};}
test('map voting redraw preserves horizontal and vertical viewport but a different floor starts independently',()=>{
 const view=createPveMapViewport();let node={dataset:{mapKey:'r:1'},scrollTop:840,scrollLeft:130};const root={querySelector:()=>node};view.capture(root);
 node={dataset:{mapKey:'r:1'},scrollTop:0,scrollLeft:0};view.restore(root);assert.equal(node.scrollTop,840);assert.equal(node.scrollLeft,130);
 node={dataset:{mapKey:'r:2'},scrollTop:0,scrollLeft:0};view.restore(root);assert.equal(node.scrollTop,0);
 node={dataset:{mapKey:'r:1'},scrollTop:0,scrollLeft:0};view.capture(root);node.scrollTop=100;view.restore(root);assert.equal(node.scrollTop,0);
});
test('map button pressed style retains its absolute-position centering transform',()=>{
 const css=fs.readFileSync(new URL('../src/pve-beta.css',import.meta.url),'utf8');
 assert.match(css,/\.pve-map-node:not\(:disabled\):active\{transform:translate\(-50%,-50%\);scale:1\}/);
});
test('owner gambler hand physical IDs remain valid after reshuffle and peer IDs stay hidden',()=>{
 const p=player('g','gambler'),other=player('o','mage'),run=runOf([p,other]);run.combat=newCombatState(run.players,999,'NORMAL_COMBAT');beginTurn(run);
 const priv=run.combat.privateByPlayer.g;priv.remainingCardIds=[p.cardPool[4].id,p.cardPool[2].id];priv.drawPileIds=p.cardPool.map(c=>c.id).filter(id=>!priv.remainingCardIds.includes(id));priv.discardPileIds=[];
 const projected=projectRun(run,'g'),bundle={run:projected,members:[{id:'g',character_id:'gambler'},{id:'o',character_id:'mage'}],characters:[]};
 const ui=pveGameplayPlayers(bundle,projected).g;
 assert.deepEqual(ui.cycleCards.map(c=>c.id),priv.remainingCardIds);
 assert.doesNotThrow(()=>submitCard(run,'g',ui.cycleCards[0].id));
 const peer=projectRun(run,'o');assert.equal(peer.privateCombat.playerId,'o');assert.ok(!JSON.stringify(peer.players.find(x=>x.playerId==='g').cardPool).includes('g:base:'));
});
test('event entry refills spent cards and resets combat skill stacks while preserving Ghost devour',()=>{
 const players=[player('m','mage'),player('f','martial_artist'),player('s','prophet'),player('d','demon_swordsman')],run=runOf(players);
 players[0].augments=['aug-099'];players[3].augments=['aug-351'];
 for(const p of players)p.publicResources={mana:7,combo:3,revelation:6,devour:12,ghostSlashLevel:2};
 run.cardCycles=Object.fromEntries(players.map(p=>[p.playerId,{cycleIndex:5,spentCardIds:p.cardPool.slice(0,2).map(c=>c.id),remainingCardIds:p.cardPool.slice(2).map(c=>c.id)}]));
 run.phase='ROOM_ENTER';enterEventRoom(run);
 for(const p of players){const state=run.roomState.privateByPlayer[p.playerId];assert.equal(state.cycleIndex,1);assert.deepEqual(state.spentCardIds,[]);assert.equal(state.remainingCardIds.length,p.cardPool.length);}
 assert.equal(players[0].publicResources.mana,2);assert.equal(players[0].publicResources.manaMax,7);assert.equal(players[1].publicResources.combo,0);assert.equal(players[2].publicResources.revelation,0);assert.equal(players[3].publicResources.devour,12);assert.equal(players[3].publicResources.ghostSlashLevel,2);
});
test('All-In opportunity follows turns 1,4,7 even when the first judgment collides',()=>{
 const p=player('g','gambler');p.augments=['aug-231'];const run=runOf([p]);run.combat={id:'combat',turn:1};
 const seen=[];
 for(let turn=1;turn<=7;turn++){
  run.combat.turn=turn;const state=freshGamblerState(p);state.remainingCardIds=p.cardPool.slice(0,2).map(c=>c.id);state.drawPileIds=p.cardPool.slice(2).map(c=>c.id);
  const resolved={playerId:'g',cardInstanceId:state.remainingCardIds[0],valid:turn!==1};
  const attempt=prepareGamblerAllIn(run,p,state,{cardInstanceId:resolved.cardInstanceId},resolved);
  if(attempt){seen.push(turn);finalizeGamblerAllIn(run,p,state,resolved);}
  assert.equal(projectRun({...run,combat:{...run.combat,privateByPlayer:{g:state}}},'g').players[0].publicResources.allInReady,(turn-1)%3===0);
 }
 assert.deepEqual(seen,[1,4,7]);
});
test('Mage UI reads authoritative expanded mana caps and offers +4 at the real seven-mana cost',()=>{
 const p=player('m','mage');p.augments=['aug-099'];p.publicResources={mana:7,manaMax:7};
 assert.deepEqual(pveMageLimits(p),{manaMax:7,amplifyMax:4,reverse:false});assert.deepEqual(pveMageChoices(p,null),[1,2,3,4]);assert.equal(pveAmplifyCost(4),7);
 const badges=pveResourceBadgesMarkup(pveResourceBadges(p));assert.match(badges,/증폭 최대/);assert.match(badges,/\+4/);assert.match(badges,/마나 최대/);
 p.augments=['aug-092'];assert.equal(pveMageLimits(p).amplifyMax,3);p.augments=['aug-111','aug-099'];assert.equal(pveMageLimits(p).amplifyMax,2);
});
test('public augmentation counters render named fill bars without private runtime objects',()=>{
 const p={characterId:'gunner',publicResources:{overheat:2,burstOutput:1,precisionShotPreserved:true,privateCardIds:['secret']}};
 const markup=pveResourceBadgesMarkup(pveResourceBadges(p));assert.match(markup,/과열/);assert.match(markup,/2\/3/);assert.match(markup,/전탄 출력/);assert.match(markup,/정밀 사격/);assert.doesNotMatch(markup,/secret/);
});
test('monster attack turn is marked on the illustration and charging turns are not',()=>{
 assert.match(sharedEncounterMarkup({monster:{hp:10,maxHp:10,imminent:true}}),/enemy-art monster-action-turn/);
 assert.doesNotMatch(sharedEncounterMarkup({monster:{hp:10,maxHp:10,imminent:false}}),/enemy-art monster-action-turn/);
});

test('Mage seven-mana amplify preview and expanded combo gauge reflect actual capacities',async()=>{
 const {activeButton,revelationGauge}=await import('../src/character-ui.js');
 const markup=activeButton({skillId:'amplify',characterRuntimeState:{mana:7,manaMax:7,pveAmplify:true}},4,false);
 assert.match(markup,/마나 0\/7/);assert.doesNotMatch(markup,/마나 -/);
 const combo=revelationGauge({skillId:'combo',characterRuntimeState:{comboStacks:4,comboMax:4}});
 assert.match(combo,/aria-valuemax="4"/);assert.equal((combo.match(/revelation-pip filled/g)||[]).length,4);
});
test('public projection only exposes named confirmed augmentation counters',()=>{
 const p=player('b','berserker');p.augments=['aug-129','aug-136','aug-139'];const run=runOf([p]);
 run.augmentFramework={berserker:{b:{vigor:2,woundMemory:1,brawl:3,secretHistory:['secret-card-id']}},once:{},statuses:[],delayed:[],grants:{},acquired:{},temporary:[],telemetry:[],recoveryCounts:{},sequence:0};
 const out=projectRun(run,'b');assert.equal(out.players[0].publicResources.berserkerVigor,2);assert.equal(out.players[0].publicResources.berserkerWound,1);assert.equal(out.players[0].publicResources.berserkerBrawl,3);assert.doesNotMatch(JSON.stringify(out),/secret-card-id/);
});
