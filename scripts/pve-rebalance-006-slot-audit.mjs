// Offline lifecycle fixtures. Counts are separate from randomized expeditions.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {fixture} from '../tests/helpers/prophet-vampire-fixture.mjs';
import {prophecySlot} from '../supabase/functions/game-api/prophet-vampire-core.js';
import {coreState,activateFragment,captureFragments,prepareFragmentCards,consumeFragment,resetProphecyCycle} from '../supabase/functions/game-api/pve/prophet-vampire-rework.js';
import {enterShopRoom,reserveShopCard,confirmShopCard} from '../supabase/functions/game-api/pve/rooms.js';
import {installRelicCatalog} from '../supabase/functions/game-api/pve/relics.js';
import {F1_RELIC_DEFINITIONS} from '../supabase/functions/game-api/pve/content-f1.js';
const metrics={scope:'DEDICATED_AUTHORITATIVE_LIFECYCLE_FIXTURES',cases:100,ShopVisits:0,ReplacementSelections:0,ProphecySlotReplacementAttempts:0,MalformedSlotRequests:0,FragmentCreated:0,FragmentSubmitted:0,Aug169FragmentPreservedCycleResets:0,ReconnectRestoreChecks:0,failures:0},rows=[];
for(let i=0;i<100;i++){
 const f=fixture(169),id=prophecySlot(f.p).id;f.p.runGold=100;installRelicCatalog(f.run,F1_RELIC_DEFINITIONS);
 const reconnect=()=>{const copy=JSON.parse(JSON.stringify(f.run)),p=copy.players[0];assert.equal(prophecySlot(p).id,id);assert.deepEqual(coreState(copy,p),coreState(f.run,f.p));metrics.ReconnectRestoreChecks++;};
 f.p.publicResources.revelation=6;activateFragment(f.run,f.p);captureFragments(f.run,f.cards,f.events);metrics.FragmentCreated++;reconnect();
 const priv=f.run.combat.privateByPlayer[f.p.playerId];priv.remainingCardIds=[id];priv.spentCardIds=f.p.cardPool.filter(c=>c.id!==id).map(c=>c.id);
 assert.equal(resetProphecyCycle(f.run,f.p,priv),true);assert.ok(f.s.fragment);metrics.Aug169FragmentPreservedCycleResets++;
 prepareFragmentCards(f.run,f.cards);consumeFragment(f.run,f.p,{...f.rc,valid:i%2===0,invalidReason:i%2?'COLLISION':null});metrics.FragmentSubmitted++;assert.equal(f.s.zeroState,'USED_ZERO');reconnect();
 priv.remainingCardIds=[];resetProphecyCycle(f.run,f.p,priv);assert.equal(f.s.zeroState,'BASE_ZERO');reconnect();
 enterShopRoom(f.run);metrics.ShopVisits++;const item=f.run.roomState.cardStock[0],replacement=f.p.cardPool.find(c=>c.id!==id);reserveShopCard(f.run,f.p.playerId,item.id,1000);
 const before=structuredClone(f.run);for(let retry=0;retry<2;retry++){assert.throws(()=>confirmShopCard(f.run,f.p.playerId,item.id,id,1001),e=>e.code==='PROPHET_PROPHECY_SLOT_LOCKED');metrics.MalformedSlotRequests++;assert.deepEqual(f.run,before);}
 confirmShopCard(f.run,f.p.playerId,item.id,replacement.id,1001);metrics.ReplacementSelections++;assert.equal(prophecySlot(f.p).id,id);
 rows.push({case:i,slotId:id,fragmentConsumed:true,aug169Preserved:true,reconnectChecks:3,shopReplacementSlot:replacement.id,slot1Attempt:false});
}
fs.writeFileSync(process.argv[2]||'slot-audit.json',JSON.stringify({metrics,rows}));console.log(JSON.stringify(metrics));
