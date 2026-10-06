import test from 'node:test';
import assert from 'node:assert/strict';
import * as R from '../supabase/functions/game-api/pve/prophet-vampire-rework.js';
import {AUGMENT_BY_ID,augmentCandidates} from '../supabase/functions/game-api/pve/augment-catalog.js';
import {fixture,cases,command,failed,valid,damage,post,end} from './helpers/prophet-vampire-fixture.mjs';

// The former recovery/prediction contracts are explicitly superseded by the user-confirmed replacement.
for(let n=151;n<=180;n++){
 const c=cases[n];
 test(`Prophet replacement ${n} actual effect`,()=>{const f=fixture(n);c.setup?.(f);c.act(f);assert.deepEqual(c.read(f),c.want);});
 test(`Prophet replacement ${n} missing augment cannot fire`,()=>{const f=fixture(n);f.p.augments=[];c.setup?.(f);c.act(f);assert.deepEqual(c.read(f),c.without);});
}
