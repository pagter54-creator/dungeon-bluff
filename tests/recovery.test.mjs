import test from 'node:test';
import assert from 'node:assert/strict';
import { withRequestTimeout } from '../src/request-timeout.js';
import { finishAnimation } from '../src/animation-wait.js';

test('stalled request aborts and releases its caller, and a subsequent request succeeds', async () => {
 let signal;
 await assert.rejects(withRequestTimeout(s => { signal=s; return new Promise(()=>{}); },10),/서버 응답이 지연/);
 assert.equal(signal.aborted,true);
 assert.equal(await withRequestTimeout(async()=>42,100),42);
});
test('request errors propagate without leaving a timeout behind', async () => {
 await assert.rejects(withRequestTimeout(async()=>{throw new Error('network');},100),/network/);
});
test('cancelled and stalled animations release the turn queue', async () => {
 await assert.doesNotReject(finishAnimation({finished:Promise.reject(new Error('cancelled')),cancel(){}},100));
 let cancelled=false;
 await finishAnimation({finished:new Promise(()=>{}),cancel(){cancelled=true;}},10);
 assert.equal(cancelled,true);
});
import { compactHistory } from '../supabase/functions/game-api/history.js';
test('long expeditions keep recent replays and readable history without repeated player snapshots', () => {
 const state={eventLog:Array.from({length:100},(_,i)=>({turnIndex:i+1,cards:[{value:1,valid:true}],effects:[],stage:{name:'Test'},beforePlayers:{large:'x'.repeat(1000)},afterPlayers:{large:'x'.repeat(1000)}}))};
 const before=JSON.stringify(state).length;compactHistory(state);
 assert.equal(state.eventLog.length,100);assert.equal(state.eventLog[0].turnIndex,1);
 assert.equal(state.eventLog[0].beforePlayers,undefined);assert.equal(state.eventLog[0].cards[0].value,1);
 assert.ok(state.eventLog[98].beforePlayers);assert.ok(state.eventLog[99].afterPlayers);
 assert.ok(JSON.stringify(state).length < before/5);
});
