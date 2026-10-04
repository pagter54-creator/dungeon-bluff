import {choose} from './rng.js';
import {F1_MONSTER_DEFINITIONS} from './content-f1.js';
import {F2_MONSTER_DEFINITIONS} from './content-f2.js';
import {F3_MONSTER_DEFINITIONS} from './content-f3.js';

export const FLOOR_ROOM_COUNTS=Object.freeze({1:10,2:11,3:12});
export function floorRoomCount(floor){return FLOOR_ROOM_COUNTS[floor]||10;}
const GRID_WIDTH=7;
const ROOM_POOL=['NORMAL_COMBAT','NORMAL_COMBAT','NORMAL_COMBAT','EVENT','EVENT','SHOP','ELITE_COMBAT'];
const range=(first,last)=>Array.from({length:Math.max(0,last-first+1)},(_,i)=>first+i);

// Keep three or four continuous lanes between shared checkpoints. Cross-lane
// links join adjacent lanes at several distinct depths, without X crossings.
function bridgeDepths(run,rows){
  const bands=new Map();let segment=[];
  function finish(){
    const candidates=segment.slice(0,-1).map(row=>row[0].depth);
    const selected=[],required=Math.min(2,candidates.length);
    while(selected.length<required){
      const depth=choose(run,candidates,`map-bridge-required:${run.floor}:${segment[0][0].depth}:${selected.length}`);
      selected.push(depth);candidates.splice(candidates.indexOf(depth),1);
    }
    for(const depth of candidates)if(choose(run,[false,true],`map-bridge-extra:${run.floor}:${depth}`))selected.push(depth);
    let direction=choose(run,[-1,1],`map-bridge-direction:${run.floor}:${segment[0]?.[0].depth}`);
    for(const depth of selected.sort((a,b)=>a-b)){bands.set(depth,direction);direction*=-1;}
    segment=[];
  }
  for(const row of rows){
    if(row.length===1){if(segment.length)finish();}
    else segment.push(row);
  }
  if(segment.length)finish();
  return bands;
}
function assignRooms(run,rows,depthCount){
  for(const row of rows){
    if(row.length===1||row[0].depth===1)continue;
    const depth=row[0].depth,previous=rows[depth-2];
    for(const node of row){
      const prior=previous.find(n=>n.lane===node.lane)?.type;
      const pool=ROOM_POOL.filter(type=>(depth>=3||type!=='ELITE_COMBAT')&&!(type===prior&&['SHOP','ELITE_COMBAT'].includes(type)));
      node.type=choose(run,pool,`map-room:${run.floor}:${node.id}`);
    }
    if(new Set(row.map(n=>n.type)).size===1){
      const node=choose(run,row,`map-room-variety-lane:${run.floor}:${depth}`);
      node.type=choose(run,ROOM_POOL.filter(type=>type!==node.type&&(depth>=3||type!=='ELITE_COMBAT')),`map-room-variety:${run.floor}:${depth}`);
    }
  }
  // Preserve the available room families; REST and REWARD_ROOM occur only at
  // their single shared checkpoints, never on an optional side lane.
  if(depthCount>=8)for(const type of ['EVENT','SHOP','ELITE_COMBAT']){
    const nodes=rows.flat();if(nodes.some(n=>n.type===type))continue;
    const counts=new Map();for(const node of nodes)counts.set(node.type,(counts.get(node.type)||0)+1);
    const candidates=nodes.filter(n=>!n.shared&&n.depth>1&&n.depth<depthCount&&(type!=='ELITE_COMBAT'||n.depth>=3)&&counts.get(n.type)>1);
    if(candidates.length)choose(run,candidates,`map-room-coverage:${run.floor}:${type}`).type=type;
  }
}
export function generateFloorMap(run,depthCount=floorRoomCount(run.floor)){
  if(!Number.isInteger(depthCount)||depthCount<2||depthCount>12)throw new Error('Invalid PVE floor depth.');
  const laneCount=choose(run,[3,4],`map-lanes:${run.floor}`);
  const columns=laneCount===3?[1,3,5]:[0,2,4,6];
  // Production floors have >=3 ordinary rows on each side of the treasure.
  // Short custom fixtures remain supported without changing persisted maps.
  const treasureOptions=range(Math.max(3,Math.floor(depthCount/2)-1),Math.min(depthCount-5,Math.floor(depthCount/2)+1));
  const treasureDepth=depthCount>=6?choose(run,treasureOptions.length?treasureOptions:[3],`map-treasure:${run.floor}`):null;
  const restDepth=depthCount>=4?depthCount-1:null;
  const rows=[],nodes=[],edges={};
  for(let depth=1;depth<=depthCount;depth++){
    const type=depth===depthCount?'BOSS':depth===restDepth?'REST':depth===treasureDepth?'REWARD_ROOM':null;
    const row=type?[{id:`f${run.floor}-d${depth}-n0`,depth,column:3,lane:null,shared:true,type}]:
      columns.map((column,lane)=>({id:`f${run.floor}-d${depth}-n${lane}`,depth,column,lane,shared:false,
        mapOffset:choose(run,[-18,-9,0,9,18],`map-position:${run.floor}:${depth}:${lane}`),type:'NORMAL_COMBAT'}));
    rows.push(row);nodes.push(...row);
  }
  const bridges=bridgeDepths(run,rows);
  for(let index=0;index<rows.length-1;index++){
    const from=rows[index],to=rows[index+1],direction=bridges.get(index+1);
    for(const node of from){
      if(to.length===1||from.length===1){edges[node.id]=to.map(n=>n.id);continue;}
      const targets=[to[node.lane]];
      if(direction&&to[node.lane+direction])targets.push(to[node.lane+direction]);
      edges[node.id]=targets.sort((a,b)=>a.lane-b.lane).map(n=>n.id);
    }
  }
  assignRooms(run,rows,depthCount);
  const f2Boss=F2_MONSTER_DEFINITIONS[run.chosenBossIds?.[2]]||F2_MONSTER_DEFINITIONS.f2_rottenheart_ancient;
  const f3Boss=F3_MONSTER_DEFINITIONS[run.chosenBossIds?.[3]]||F3_MONSTER_DEFINITIONS.f3_abyss_king;
  return {
    generatorVersion:2,gridWidth:GRID_WIDTH,laneCount,
    checkpoints:{treasureDepth,restDepth,bossDepth:depthCount},
    depthCount,nodes,edges,currentNodeId:null,visitedNodeIds:[],votes:{},voteRound:0,voteDeadline:null,
    bossId:run.floor===1?(run.chosenBossIds?.[1]||F1_MONSTER_DEFINITIONS.f1_fallen_lord.id):run.floor===2?f2Boss.id:f3Boss.id,
    bossName:run.floor===1?(F1_MONSTER_DEFINITIONS[run.chosenBossIds?.[1]]||F1_MONSTER_DEFINITIONS.f1_fallen_lord).name:run.floor===2?f2Boss.name:f3Boss.name
  };
}
export function startingNodeIds(map){return map.nodes.filter(n=>n.depth===1).map(n=>n.id);}
export function connectedNodeIds(map){
  if(!map.currentNodeId)return startingNodeIds(map);
  return map.edges[map.currentNodeId]||[];
}
export function resolveVote(run,humanPlayerIds,nowMs=Date.now()){
  const candidates=connectedNodeIds(run.map);
  if(!candidates.length)throw new Error('No connected PVE room.');
  const counts=Object.fromEntries(candidates.map(id=>[id,0]));
  for(const pid of humanPlayerIds){const vote=run.map.votes[pid];if(Object.hasOwn(counts,vote))counts[vote]++;}
  const max=Math.max(...Object.values(counts));
  let tied=candidates.filter(id=>counts[id]===max);
  if(max===0)tied=candidates;
  const winner=tied.length===1?tied[0]:choose(run,tied,`vote:${run.floor}:${run.depth}:${run.map.voteRound}`);
  run.map.currentNodeId=winner;
  run.map.visitedNodeIds=Array.isArray(run.map.visitedNodeIds)?run.map.visitedNodeIds:[];
  if(!run.map.visitedNodeIds.includes(winner))run.map.visitedNodeIds.push(winner);
  run.map.votes={}; run.map.voteRound+=1; run.map.voteDeadline=null;
  run.depth=run.map.nodes.find(n=>n.id===winner)?.depth||run.depth;
  return winner;
}
