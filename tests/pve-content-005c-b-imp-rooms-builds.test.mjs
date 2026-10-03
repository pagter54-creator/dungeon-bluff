import test from 'node:test';
import assert from 'node:assert/strict';
import {newPlayerRunState} from '../supabase/functions/game-api/pve/model.js';
import {enterEventRoom,submitEventCard} from '../supabase/functions/game-api/pve/events.js';
import {enterRewardRoom,submitRewardCard,resolveRewardAttempt} from '../supabase/functions/game-api/pve/rooms.js';
import {
  applyImpPreCollisionSteal,applyImpCardValidated,applyImpBeforeDamage,scopedImpState
} from '../supabase/functions/game-api/pve/imp-runtime.js';

function players(){
  return ['imp','adventurer','warrior','mage'].map((character_id,i)=>newPlayerRunState({id:'p'+i,user_id:'u'+i,member_type:'human',character_id,seat_index:i}));
}
function cardId(run,p,n,state){return p.cardPool.find(c=>c.baseNumber===n&&state.remainingCardIds.includes(c.id))?.id;}
function eventRun(augments=[]){
  const ps=players();ps[0].augments=[...augments];
  const run={id:'imp-event',roomId:'room',seed:'imp-event-seed',rngCounter:0,phase:'ROOM_ENTER',floor:1,depth:2,flame:4,maxFlame:5,currentRoomNodeId:'event-node',players:ps,relicCatalog:[]};
  enterEventRoom(run);return run;
}
function submitEventValues(run,nums,impSkillData=null){
  for(let i=0;i<4;i++){const p=run.players[i],st=run.roomState.privateByPlayer[p.playerId],id=cardId(run,p,nums[i],st);assert.ok(id);submitEventCard(run,p.playerId,id,false,i===0?impSkillData:null);}
  return run.roomState.publicTurnResult;
}
const relics=[0,1,2,3].map(i=>({id:'r'+i,name:'Relic '+i,pool:'GENERAL',effects:[]}));
function rewardRun(augments=[]){
  const ps=players();ps[0].augments=[...augments];
  const run={id:'imp-reward',roomId:'room',seed:'imp-reward-seed',rngCounter:0,phase:'ROOM_ENTER',floor:1,depth:2,flame:4,maxFlame:5,currentRoomNodeId:'reward-node',players:ps,relicCatalog:relics};
  enterRewardRoom(run);return run;
}
function submitRewardValues(run,nums,impSkillData=null){
  for(let i=0;i<4;i++){const p=run.players[i],st=run.roomState.privateByPlayer[p.playerId],id=cardId(run,p,nums[i],st);assert.ok(id);submitRewardCard(run,p.playerId,id,false,i===0?impSkillData:null);}
  return resolveRewardAttempt(run);
}
function rawRun(augments){
  const ps=players();ps[0].augments=[...augments];
  const run={id:'imp-full-build',seed:'imp-build',rngCounter:0,phase:'COMBAT',floor:1,depth:1,currentRoomNodeId:'combat-node',players:ps,combat:{id:'combat',turn:1,privateByPlayer:Object.fromEntries(ps.map(p=>[p.playerId,{cycleIndex:1}])),pendingDownPlayerIds:[]}};
  return {run,p:ps[0],players:ps};
}
function rawCards(run,nums=[2,2,2,4]){return run.players.map((p,i)=>({playerId:p.playerId,baseNumber:nums[i],workingNumber:nums[i],finalNumber:nums[i],valid:true}));}

test('005C-B EVENT allows aug-191 stored-number spend but blocks combat-only Mischief state',()=>{
  const run=eventRun(['aug-191','aug-201']);run.players[0].publicResources.stolenNumber=2;
  const result=submitEventValues(run,[1,1,2,4],{impSpend:2});
  const imp=result.cards.find(c=>c.playerId==='p0');assert.equal(imp.finalNumber,3);assert.equal(run.players[0].publicResources.stolenNumber,0);
  assert.equal(Object.keys(run.augmentFramework?.imp?.mischief||{}).length,0);
});
test('005C-B REWARD allows aug-191 stored-number spend without combat-only bonus conversion',()=>{
  const run=rewardRun(['aug-191','aug-181','aug-201']);run.players[0].publicResources.stolenNumber=2;
  const result=submitRewardValues(run,[1,1,2,4],{impSpend:2});const imp=result.cards.find(c=>c.playerId==='p0');
  assert.equal(imp.finalNumber,3);assert.equal(run.players[0].publicResources.stolenNumber,0);
  assert.equal(imp.damage,3);assert.equal(Object.keys(run.augmentFramework?.imp?.mischief||{}).length,0);
});
test('005C-B full 대담한 슬쩍 build executes steal/damage interaction without silent handlers',()=>{
  const build=[...Array(10)].map((_,i)=>'aug-'+String(181+i).padStart(3,'0'));const {run,p}=rawRun(build),cs=rawCards(run);
  applyImpPreCollisionSteal(run,cs,[]);const rc=cs[0];rc.valid=true;applyImpCardValidated(run,{player:p,resolved:rc,cards:cs,events:[]});
  const damage={amount:rc.finalNumber};applyImpBeforeDamage(run,{player:p,resolved:rc,damage});assert.ok(damage.amount>rc.finalNumber);assert.ok(scopedImpState(run,p).greed>=1);
});
test('005C-B full 소매치기 악동 build executes stored-number resource interaction',()=>{
  const build=[...Array(10)].map((_,i)=>'aug-'+String(191+i).padStart(3,'0'));const {run,p}=rawRun(build),cs=rawCards(run);
  applyImpPreCollisionSteal(run,cs,[]);assert.ok(Number(p.publicResources.stolenNumber)>0);assert.equal(rcSafe(cs[0].finalNumber),2);
});
function rcSafe(v){return Number(v);}
test('005C-B full 장난의 연쇄 build creates scoped Mischief without recursive steal',()=>{
  const build=[...Array(10)].map((_,i)=>'aug-'+String(201+i).padStart(3,'0'));const {run,p}=rawRun(build),cs=rawCards(run);
  const events=[];applyImpPreCollisionSteal(run,cs,events);const count=events.length;applyImpPreCollisionSteal(run,cs,events);
  assert.equal(events.length,count);assert.ok(Object.keys(run.augmentFramework.imp.mischief).length>=1);assert.equal(p.characterId,'imp');
});
