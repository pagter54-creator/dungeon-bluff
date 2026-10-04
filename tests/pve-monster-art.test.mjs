import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {F1_MONSTER_DEFINITIONS} from '../supabase/functions/game-api/pve/content-f1.js';
import {F2_MONSTER_DEFINITIONS} from '../supabase/functions/game-api/pve/content-f2.js';
import {F3_MONSTER_DEFINITIONS} from '../supabase/functions/game-api/pve/content-f3.js';
import {MONSTER_IMAGES} from '../src/monster-assets.js';
import {pveStageModel} from '../src/pve-gameplay-adapter.js';

test('every implemented PVE monster has a displayable illustration',()=>{
  const monsters=[...Object.values(F1_MONSTER_DEFINITIONS),...Object.values(F2_MONSTER_DEFINITIONS),...Object.values(F3_MONSTER_DEFINITIONS)];
  assert.equal(monsters.length,36);
  for(const monster of monsters){
    const roomType=monster.tier==='BOSS'?'BOSS':monster.tier==='ELITE'?'ELITE_COMBAT':'NORMAL_COMBAT';
    const stage=pveStageModel({floor:monster.floor,depth:1,combat:{roomType,monster}});
    const url=MONSTER_IMAGES[stage.shape];
    assert.ok(url,`missing image mapping for ${monster.id}`);
    const path=fileURLToPath(url);
    assert.ok(existsSync(path),`missing PNG for ${monster.id}: ${path}`);
    const png=readFileSync(path);
    assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a',`invalid PNG for ${monster.id}`);
    if(stage.shape===monster.id)assert.equal(png[25],6,`PNG needs RGBA transparency for ${monster.id}`);
  }
});
