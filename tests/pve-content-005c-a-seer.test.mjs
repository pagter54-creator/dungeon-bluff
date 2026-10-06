import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './helpers/prophet-vampire-fixture.mjs';
import {AUGMENT_BY_ID,augmentCandidates,AUGMENT_DEFINITIONS} from '../supabase/functions/game-api/pve/augment-catalog.js';
import {augmentUi} from '../src/pve-ui-catalog.js';
import {beginAugmentChoices,chooseAugment,AUGMENT_THRESHOLDS} from '../supabase/functions/game-api/pve/augments.js';
import {SEER_CONTRACT_IDS,SEER_CONTRACTS} from '../supabase/functions/game-api/pve/seer-contracts.js';
import {SEER_HANDLER_IDS} from '../supabase/functions/game-api/pve/seer-runtime.js';
test('Prophet replacement registry exactly30 handlers and stable390 globally',()=>{
 assert.deepEqual(SEER_CONTRACT_IDS,Array.from({length:30},(_,i)=>'aug-'+(151+i)));assert.deepEqual(SEER_HANDLER_IDS,SEER_CONTRACT_IDS);assert.equal(AUGMENT_DEFINITIONS.length,390);assert.equal(new Set(AUGMENT_DEFINITIONS.map(x=>x.id)).size,390);
});
for(let n=151;n<=180;n++)test('Prophet replacement '+n+' executable source tooltip and room matrix',()=>{
 const id='aug-'+n,c=SEER_CONTRACTS[id],d=AUGMENT_BY_ID[id];assert.equal(d.executable,true);assert.ok(augmentCandidates('prophet',d.tier,d.build).some(x=>x.id===id));assert.equal(augmentUi(id,d.tier).name,c.name);assert.equal(c.executionRuleSource,'USER_CONFIRMED_PROPHET_VAMPIRE_CORE_REWORK_20261006');
 assert.deepEqual(c.roomApplicability,{COMBAT:true,EVENT:false,REWARD:false,SHOP:false,REST:false});assert.ok(c.condition.length>10);assert.ok(c.idempotencyRule);assert.ok(c.reconnectRule);
});
for(const start of [151,161,171])test('Prophet build '+start+' authentic EXP offers through all four stages',()=>{
 const {run,p}=fixture(start);delete run.combat;run.phase='ROOM_RESULT';p.augments=[];
 for(let stage=1;stage<=4;stage++){p.growthExp=AUGMENT_THRESHOLDS[stage-1];beginAugmentChoices(run);const id='aug-'+(start+(stage===1?0:1+(stage-2)*3));chooseAugment(run,'p0',id);assert.ok(p.augments.includes(id));assert.equal(run.phase,'ROOM_RESULT');}
});
