import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {EVENT_IMAGES} from '../src/event-assets.js';
import {eventArt} from '../src/art.js';
import {ROOMS} from '../supabase/functions/game-api/content.js';
import {F1_EVENT_DEFINITIONS} from '../supabase/functions/game-api/pve/content-f1.js';

test('every existing competitive event retains its PNG',()=>{
  for(const id of Object.keys(ROOMS)){
    assert.ok(EVENT_IMAGES[id],id);
    assert.ok(fs.existsSync(new URL(EVENT_IMAGES[id])),id);
  }
});
test('every runtime PVE event has dedicated art, overriding reused art in old saves',()=>{
  for(const def of F1_EVENT_DEFINITIONS){
    assert.ok(EVENT_IMAGES[def.id],def.id);
    assert.notEqual(EVENT_IMAGES[def.id],EVENT_IMAGES[def.illustration]);
    assert.ok(eventArt('event',def.id,def.illustration).includes(EVENT_IMAGES[def.id]));
  }
});
test('both generated assets are complete RGBA PNGs',()=>{
  for(const def of F1_EVENT_DEFINITIONS){
    const png=fs.readFileSync(new URL(EVENT_IMAGES[def.id]));
    assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
    assert.equal(png.subarray(12,16).toString(),'IHDR');
    assert.ok(png.readUInt32BE(16)>=1024);
    assert.ok(png.readUInt32BE(20)>=1024);
    assert.equal(png[25],6,'PNG must include alpha');
    assert.equal(png.subarray(-8,-4).toString(),'IEND');
  }
});
test('unknown event IDs still use a known illustration or the existing vector fallback',()=>{
  assert.ok(eventArt('event','unknown','ancient_gate').includes(EVENT_IMAGES.ancient_gate));
  assert.ok(eventArt('event','unknown').startsWith('<svg'));
});
test('PVE encounter renderer supplies stable event ID before legacy illustration ID',()=>{
  const app=fs.readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
  assert.ok(app.includes('eventArt(category,run.roomState?.eventId,run.roomState?.illustration)'));
});
