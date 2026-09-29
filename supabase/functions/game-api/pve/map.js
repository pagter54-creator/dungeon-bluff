import {choose} from './rng.js';
import {F1_MAP_LAYOUT,F1_MONSTER_DEFINITIONS} from './content-f1.js';
import {F2_MONSTER_DEFINITIONS} from './content-f2.js';

export function generateFloorMap(run,depthCount=8){
  const nodes=[]; const edges={};
  for(let depth=1;depth<=depthCount;depth++){
    const count=depth===depthCount?1:depth%3===1?2:1;
    const pair=F1_MAP_LAYOUT[(depth-1)%F1_MAP_LAYOUT.length]||['NORMAL_COMBAT','EVENT'];
    const swapped=count===2&&choose(run,[false,true],`map-lane-swap:${run.floor}:${depth}`);
    for(let lane=0;lane<count;lane++){
      const id=`f${run.floor}-d${depth}-n${lane}`;
      let type='BOSS';
      if(depth!==depthCount)type=count===1&&depth===3?pair[1]||pair[0]:pair[swapped?1-lane:lane]||pair[0];
      nodes.push({id,depth,type});
    }
  }
  for(let depth=1;depth<depthCount;depth++){
    const from=nodes.filter(n=>n.depth===depth), to=nodes.filter(n=>n.depth===depth+1);
    for(let i=0;i<from.length;i++){
      edges[from[i].id]=to.map(node=>node.id);
    }
  }
  const f2Boss=F2_MONSTER_DEFINITIONS[run.chosenBossIds?.[2]]||F2_MONSTER_DEFINITIONS.f2_rottenheart_ancient;
  return {
    depthCount,nodes,edges,currentNodeId:null,visitedNodeIds:[],votes:{},voteRound:0,voteDeadline:null,
    bossId:run.floor===1?(run.chosenBossIds?.[1]||F1_MONSTER_DEFINITIONS.f1_fallen_lord.id):run.floor===2?f2Boss.id:null,
    bossName:run.floor===1?(F1_MONSTER_DEFINITIONS[run.chosenBossIds?.[1]]||F1_MONSTER_DEFINITIONS.f1_fallen_lord).name:run.floor===2?f2Boss.name:'3층 보스 · CONTENT-003 준비 중'
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
