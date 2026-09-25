import test from 'node:test';
import assert from 'node:assert/strict';
import { GameAudio } from '../src/audio.js';

test('combat cues share master volume, reuse noise and clean up their audio nodes',async()=>{
 const {audio,context}=setup();const nodes=[];let buffers=0;
 const param=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){},setTargetAtTime(){}});
 const node=()=>{const n={gain:param(),frequency:param(),Q:param(),connect(target){this.target=target;},disconnect(){this.disconnected=true;},start(){},stop(){this.onended?.();}};nodes.push(n);return n;};
 Object.assign(context,{sampleRate:8000,createGain:node,createOscillator:node,createBufferSource:node,createBiquadFilter:node,createBuffer(){buffers++;return {getChannelData:()=>new Float32Array(8000)};}});
 audio.combatCue('flip');assert.equal(nodes.length,0);
 await audio.activate();
 for(const cue of ['flip','reveal','crack','launch','hit','heavy','hurt','skill_gold_bonus','skill_toughness','skill_low_card_gold','skill_amplify','skill_blood_heat','skill_revelation','skill_score_steal','skill_random_hand']){
  const before=nodes.length;audio.combatCue(cue);assert.ok(nodes.length>before,`${cue} must produce sound`);
 }
 assert.equal(buffers,1);assert.ok(nodes.slice(1).every(n=>n.disconnected));
 assert.ok(nodes.some(n=>n.target===audio.master));
 const count=nodes.length;audio.toggleMute();audio.combatCue('heavy');assert.equal(nodes.length,count);
 audio.toggleMute();audio.setHidden(true);audio.combatCue('hit');assert.equal(nodes.length,count);
});

function setup(saved = null) {
  const music = { paused: true, plays: 0, pauses: 0, async play() { this.paused = false; this.plays++; }, pause() { this.paused = true; this.pauses++; } };
  const values = new Map(saved == null ? [] : [['dungeon-bluff.volume', saved]]);
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  const context = { state: 'suspended', currentTime: 0, destination: {}, async resume() { this.state = 'running'; }, createGain() { return { gain: { value: 1, setTargetAtTime(value) { this.value = value; } }, connect() {} }; } };
  return { music, values, context, audio: new GameAudio({ music, storage, createContext: () => context }) };
}
test('BGM waits for activation, loops, and uses half the slider gain while effects use double gain', async () => {
  const { audio, music, context } = setup();
  assert.equal(music.plays, 0); assert.equal(music.loop, true); assert.equal(music.preload, 'none');
  await audio.activate(); assert.equal(music.plays, 1); assert.equal(context.state, 'running');
  audio.setVolume(.23); assert.equal(music.volume, .115); assert.equal(audio.master.gain.value, .46);
});
test('zero volume mutes music and effects and mute restores the previous volume', async () => {
  const { audio, music, values } = setup('0.7'); await audio.activate();
  audio.toggleMute(); assert.equal(audio.volume, 0); assert.equal(music.paused, true); assert.equal(audio.master.gain.value, 0);
  assert.doesNotThrow(() => audio.tone());
  audio.toggleMute(); assert.equal(audio.volume, .7); assert.equal(music.paused, false);
  assert.equal(values.get('dungeon-bluff.volume'), '0.7');
});
test('hidden tabs pause BGM; foreground resumes without losing volume', async () => {
  const { audio, music } = setup(); await audio.activate(); audio.setHidden(true);
  assert.equal(music.paused, true); audio.setHidden(false); assert.equal(music.paused, false); assert.equal(music.volume, .25);
});
test('missing mp3, denied storage and unavailable Web Audio do not break gameplay', async () => {
  const music = { paused: true, play: async () => { throw new Error('missing'); }, pause() {} };
  const storage = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };
  const audio = new GameAudio({ music, storage, createContext() { throw new Error('unsupported'); } });
  await assert.doesNotReject(audio.activate()); assert.doesNotThrow(() => audio.setVolume(.6)); assert.doesNotThrow(() => audio.tone());
});

test('scene changes switch music while repeated room updates preserve playback', async () => {
  const { audio, music } = setup('0.7');
  assert.ok(music.src.endsWith('/bgm_lobby.mp3'));
  await audio.activate();
  await audio.setScene('dungeon');
  assert.ok(music.src.endsWith('/bgm_dungeon.mp3')); assert.equal(music.volume, .35);
  assert.equal(music.plays, 2); assert.equal(music.currentTime, 0);
  music.currentTime = 24;
  await audio.setScene('dungeon');
  assert.equal(music.plays, 2); assert.equal(music.currentTime, 24);
  await audio.setScene('lobby');
  assert.ok(music.src.endsWith('/bgm_lobby.mp3')); assert.equal(music.plays, 3);
});

test('switching music respects mute, hidden tabs and pre-gesture reconnects', async () => {
  const { audio, music } = setup();
  await audio.setScene('dungeon'); assert.equal(music.plays, 0);
  await audio.activate(); audio.toggleMute();
  await audio.setScene('lobby'); assert.equal(music.plays, 1); assert.equal(music.paused, true);
  audio.setHidden(true); audio.toggleMute();
  await audio.setScene('dungeon'); assert.equal(music.plays, 1);
  audio.setHidden(false); assert.equal(music.plays, 2); assert.equal(music.volume, .25);
});

test('missing character SFX falls back once and mute suppresses file/fallback playback', async () => {
  const {audio}=setup(); await audio.activate();let fallback=0,created=0;
  const previous=globalThis.Audio;
  globalThis.Audio=class { constructor(){created++;} play(){return Promise.reject(new Error('missing sfx'));} pause(){} };
  try {
    audio.playSfx('sfx_attack_mage',()=>fallback++);
    await new Promise(resolve=>setTimeout(resolve,0));
    assert.equal(fallback,1);assert.equal(audio.voices.size,0);
    audio.playSfx('sfx_attack_mage',()=>fallback++);assert.equal(created,1);assert.equal(fallback,2);
    audio.toggleMute();audio.playSfx('sfx_attack_warrior',()=>fallback++);assert.equal(created,1);assert.equal(fallback,2);
  }finally{if(previous===undefined)delete globalThis.Audio;else globalThis.Audio=previous;}
});
