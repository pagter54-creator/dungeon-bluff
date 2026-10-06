import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {pveTurnKey,requestPveMutation,drainPvePresentationQueue} from '../src/pve-state-flow.js';
import {pveMapOverlayMarkup,pvePlayerAugmentsMarkup} from '../src/pve-roguelike-ui.js';
import {skillBadge} from '../src/character-ui.js';
const run={id:'run',version:1,floor:1,currentRoomNodeId:'a',phase:'COMBAT',combat:{turn:2,publicTurnResult:{turn:1}}};
const conflict=latest=>Object.assign(new Error('STATE_CONFLICT'),{code:'STATE_CONFLICT',data:{run:latest}});
test('presentation identity changes across rooms and floors even when turn numbers restart',()=>{
  assert.equal(pveTurnKey(run),pveTurnKey(structuredClone(run),{turnIndex:1}));
  assert.notEqual(pveTurnKey(run),pveTurnKey({...run,currentRoomNodeId:'b'}));
  assert.notEqual(pveTurnKey(run),pveTurnKey({...run,floor:2}));
  assert.equal(pveTurnKey({...run,combat:null}),'');
});
test('simultaneous submissions retry current version with the same idempotent action ID',async()=>{
  const calls=[],refreshed=[];
  const result=await requestPveMutation(async(action,params)=>{calls.push({...params});if(calls.length<3)throw conflict({...run,version:calls.length+1});return {run:{...run,version:4}};},'pve.submitCard',{action_id:'same',expected_version:1,card_id:'card'},run,r=>refreshed.push(r.version));
  assert.equal(result.run.version,4);assert.deepEqual(calls.map(p=>p.expected_version),[1,2,3]);assert.deepEqual(calls.map(p=>p.action_id),['same','same','same']);assert.deepEqual(refreshed,[2,3]);
});
test('a stale selection never retries into another turn, phase, room or floor',async()=>{
  for(const changed of [{combat:{turn:3}},{phase:'ROOM_RESULT'},{currentRoomNodeId:'b'},{floor:2}]){
    let calls=0,refresh;
    await assert.rejects(requestPveMutation(async()=>{calls++;throw conflict({...run,...changed,version:2});},'pve.submitCard',{action_id:'same'},run,r=>refresh=r),/방이나 턴이 변경/);
    assert.equal(calls,1);assert.equal(refresh.version,2);
  }
});
test('retry is bounded and other server errors pass through',async()=>{
  let calls=0;
  await assert.rejects(requestPveMutation(async()=>{calls++;throw conflict({...run,version:calls+1});},'pve.submitCard',{},run,()=>{}),/다시 제출/);assert.equal(calls,4);
  const error=new Error('invalid card');await assert.rejects(requestPveMutation(async()=>{throw error;},'pve.submitCard',{},run,()=>{}),e=>e===error);
});
test('map shows each human voter with escaped names and omits AI votes',()=>{
  const mapRun={...run,phase:'MAP_VOTE',depth:0,players:[{playerId:'p1',memberType:'human',seat:0},{playerId:'p2',memberType:'human',seat:1},{playerId:'ai',memberType:'ai',seat:2}],map:{depthCount:1,nodes:[{id:'a',type:'REST',depth:1}],edges:{},votes:{p1:'a',p2:'a',ai:'a'}}};
  const markup=pveMapOverlayMarkup(mapRun,null,{members:[{id:'p1',display_name:'<Alice>'},{id:'p2',display_name:'Bob'}]});
  assert.match(markup,/&lt;Alice&gt; · Bob/);assert.match(markup,/2표/);assert.doesNotMatch(markup,/3표/);assert.match(markup,/모든 플레이어가 투표/);
});
test('skill popup owner survives duplicate characters and exposes only that players chosen augments',()=>{
  const character={id:'mage',definition:{skill:{type:'active',name:'증폭',description:'설명'}}};
  assert.match(skillBadge(character,'p1'),/data-member="p1"/);assert.match(skillBadge(character,'p2'),/data-member="p2"/);
  assert.match(pvePlayerAugmentsMarkup({augments:['aug-235']}),/선택한 증강/);
  assert.match(pvePlayerAugmentsMarkup({augments:[]}),/아직 선택한 증강/);assert.equal(pvePlayerAugmentsMarkup(null),'');
});
test('reward selectors never hide mandatory desktop submit controls through CSS',()=>{
  const app=fs.readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
  assert.ok(app.includes("selector&&!eventSelecting&&!rewardSelecting?'pve-selector-shell':''"));
});

test('final boss turn keeps its encounter identity after automatic floor advance',()=>{
  const before={...run,combat:{publicTurnResult:{turn:9}}};
  const advanced={...before,floor:2,currentRoomNodeId:null,combat:null,floorTransitionResult:{floor:1,roomNodeId:'a',publicTurnResult:{turn:9}}};
  assert.equal(pveTurnKey(before),pveTurnKey(advanced));
});

test('mandatory card controls retain a disabled submit button before selection and enable it after selection',async()=>{
  const {panelControls}=await import('../src/character-ui.js');
  const player={memberId:'p',characterId:'mage',skillId:'amplify',cycleCards:[{id:'card',value:2,used:false}],knockedOut:false};
    const empty=panelControls(player,{result:null,locked:false,selected:null,useSkill:false});
    assert.match(empty,/data-action="submit"/);assert.match(empty,/data-unavailable="true" disabled/);
    const selected=panelControls(player,{result:null,locked:false,selected:'card',useSkill:false});
    assert.match(selected,/data-action="submit"/);assert.match(selected,/data-unavailable="false"/);assert.doesNotMatch(selected,/ disabled/);
});

test('new combat results arriving during an attack animation remain queued in playback order',async()=>{
  const queue=[{room:'a',turn:4}],played=[];
  let finishAttack;
  const animation=new Promise(resolve=>finishAttack=resolve);
  const draining=drainPvePresentationQueue(queue,async result=>{played.push(result);if(result.room==='a')await animation;});
  queue.push({room:'b',turn:1},{room:'b',turn:2});
  assert.deepEqual(played,[{room:'a',turn:4}]);
  finishAttack();await draining;
  assert.deepEqual(played,[{room:'a',turn:4},{room:'b',turn:1},{room:'b',turn:2}]);assert.equal(queue.length,0);
});

test('a completed submit callback cannot replace reveal DOM while an animation is playing',async()=>{
  const {runInNewContext}=await import('node:vm');
  const source=fs.readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
  const render=source.slice(source.indexOf('function renderPve(){'),source.indexOf('async function accept('));
  const context={pveAnimating:true,bundle:{run:{id:'r',phase:'COMBAT'}},view:'pve',app:{innerHTML:'reveal DOM'}};
  runInNewContext(render+';renderPve();',context);
  assert.equal(context.app.innerHTML,'reveal DOM');
});
