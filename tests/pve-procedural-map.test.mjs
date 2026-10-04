import test from 'node:test';
import assert from 'node:assert/strict';
import {generateFloorMap,connectedNodeIds,resolveVote,floorRoomCount} from '../supabase/functions/game-api/pve/map.js';
import {pveMapGeometry,pveMapOverlayMarkup} from '../src/pve-roguelike-ui.js';
import {projectRun} from '../supabase/functions/game-api/pve/projection.js';

function create(seed,floor=1){const run={id:'map-test',seed,floor,depth:0,rngCounter:0,players:[]};run.map=generateFloorMap(run);return run;}
function inspect(map,floor){
 const length=floorRoomCount(floor),byId=new Map(map.nodes.map(n=>[n.id,n])),seen=new Set(),memo=new Map();
 assert.equal(map.depthCount,length);assert.ok(map.laneCount>=3);
 const bridgeRows=new Set();
 for(let depth=1;depth<=length;depth++){
  const row=map.nodes.filter(n=>n.depth===depth),special=row.some(n=>['REST','REWARD_ROOM','BOSS'].includes(n.type));
  if(special){assert.equal(row.length,1);assert.equal(row[0].shared,true);}
  else {assert.equal(row.length,map.laneCount);assert.deepEqual(row.map(n=>n.lane),Array.from({length:map.laneCount},(_,i)=>i));}
 }
 for(const type of ['REST','REWARD_ROOM','BOSS'])assert.equal(map.nodes.filter(n=>n.type===type).length,1);
 function visit(id){
  seen.add(id);if(memo.has(id))return memo.get(id);
  const n=byId.get(id),next=map.edges[id]||[];
  if(n.type==='BOSS'){assert.equal(n.depth,length);assert.equal(next.length,0);return {rooms:1,shared:new Set(['BOSS'])};}
  assert.ok(next.length>0,'No dead end');assert.equal(new Set(next).size,next.length);
  const results=next.map(to=>{
   const target=byId.get(to);assert.equal(target.depth,n.depth+1);
   if(!n.shared&&!target.shared){
    assert.ok(Math.abs(n.lane-target.lane)<=1,'Only neighboring lanes connect');
    if(n.lane!==target.lane)bridgeRows.add(n.depth);
   }
   return visit(to);
  });
  if(!n.shared&&next.some(to=>!byId.get(to).shared))assert.ok(next.some(to=>byId.get(to).lane===n.lane),'Every lane continues');
  const shared=new Set(results[0].shared);
  for(const result of results){assert.equal(result.rooms,results[0].rooms);for(const t of shared)assert.ok(result.shared.has(t));}
  if(n.shared)shared.add(n.type);
  const result={rooms:results[0].rooms+1,shared};memo.set(id,result);return result;
 }
 const starts=map.nodes.filter(n=>n.depth===1);assert.equal(starts.length,map.laneCount);
 for(const node of starts){const result=visit(node.id);assert.equal(result.rooms,length);assert.deepEqual([...result.shared].sort(),['BOSS','REST','REWARD_ROOM']);}
 assert.equal(seen.size,map.nodes.length);assert.ok(bridgeRows.size>=4,'Several crossover depths on both sides of treasure');
 const links=Object.entries(map.edges).flatMap(([id,targets])=>targets.map(to=>[byId.get(id),byId.get(to)]));
 for(const [a,b] of links)for(const [c,d] of links)if(a.depth===c.depth)assert.ok((a.column-c.column)*(b.column-d.column)>=0,'No X crossing');
 for(const type of ['NORMAL_COMBAT','ELITE_COMBAT','EVENT','SHOP'])assert.ok(map.nodes.some(n=>n.type===type));
}
test('3000 seeded maps: 3+ continuous lanes, crossovers, mandatory shared rooms and 10/11/12 path lengths',()=>{
 for(let floor=1;floor<=3;floor++)for(let seed=0;seed<1000;seed++)inspect(create('lanes-'+seed,floor).map,floor);
});
test('seed controls lanes, crossover positions, treasure depth and room types reproducibly',()=>{
 const layouts=new Set(),types=new Set(),lanes=new Set(),treasures=new Set();
 for(let seed=0;seed<100;seed++){
  const a=create('diversity-'+seed),b=create('diversity-'+seed);
  assert.deepEqual(a,b);layouts.add(JSON.stringify(a.map.edges));types.add(JSON.stringify(a.map.nodes.map(n=>n.type)));
  lanes.add(a.map.laneCount);treasures.add(a.map.checkpoints.treasureDepth);
 }
 assert.ok(layouts.size>=30);assert.ok(types.size>=90);assert.equal(lanes.size,2);assert.ok(treasures.size>1);
});
test('votes and reconnect retain the same lane, shared checkpoints and deterministic RNG',()=>{
 const run=create('vote-lanes'),snapshot=JSON.parse(JSON.stringify(run));
 for(let depth=1;depth<=10;depth++){
  const chosen=connectedNodeIds(run.map).at(-1);
  run.map.votes={human:chosen,ai:'unconnected'};snapshot.map.votes={human:chosen,ai:'unconnected'};
  assert.equal(resolveVote(run,['human']),chosen);assert.equal(resolveVote(snapshot,['human']),chosen);
  assert.equal(run.depth,depth);assert.deepEqual(snapshot,run);
 }
 assert.equal(connectedNodeIds(run.map).length,0);assert.equal(run.map.visitedNodeIds.length,10);
 assert.deepEqual(projectRun(run,'human').map,run.map);
});
test('map popup renders saved columns without overlap and preserves legacy saved layouts',()=>{
 const run=create('geometry');run.phase='MAP_VOTE';run.players=[{playerId:'p',userId:'u'}];
 const geo=pveMapGeometry(run);
 for(const n of geo.nodes){assert.equal(n.x,80+n.column*140+(n.mapOffset||0));for(const other of geo.nodes)if(other.id!==n.id&&other.depth===n.depth)assert.ok(Math.abs(n.x-other.x)>=244);}
 const html=pveMapOverlayMarkup(run,'u');assert.match(html,/role="dialog"/);assert.match(html,/pve-map-canvas procedural/);
 const old={floor:1,map:{depthCount:2,nodes:[{id:'a',depth:1,type:'NORMAL_COMBAT'},{id:'b',depth:1,type:'EVENT'},{id:'boss',depth:2,type:'BOSS'}],edges:{a:['boss'],b:['boss']}}};
 assert.deepEqual(pveMapGeometry(old).nodes.map(n=>n.x),[330,670,500]);
});
