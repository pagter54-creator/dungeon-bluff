import test from 'node:test';
import assert from 'node:assert/strict';
import { sameLockedMembers,conflictDelay } from '../supabase/functions/game-api/room-concurrency.js';

test('read recovery compares locked membership without treating order as a mutation',()=>{
 assert.equal(sameLockedMembers(['ai-b','human-a','ai-a'],['ai-a','ai-b','human-a']),true);
 assert.equal(sameLockedMembers(['a','a'],['a','b']),false);
 assert.equal(sameLockedMembers(['a'],['a','b']),false);
 assert.equal(sameLockedMembers(['a','b'],['a']),false);
 assert.equal(sameLockedMembers(undefined,[]),false);
 assert.equal(sameLockedMembers([],[]),true);
});
test('room conflict retries back off with jitter and remain bounded',()=>{
 assert.equal(conflictDelay(0,()=>0),20);assert.equal(conflictDelay(1,()=>0),40);
 assert.equal(conflictDelay(3,()=>0),160);assert.equal(conflictDelay(7,()=>0),200);
 assert.equal(conflictDelay(7,()=>.99),219);
 assert.ok(Array.from({length:8},(_,i)=>conflictDelay(i,()=>.99)).reduce((a,b)=>a+b,0)<1500);
});
