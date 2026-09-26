import {choose} from './rng.js';
import {F1_MAP_LAYOUT,F1_MONSTER_DEFINITIONS} from './content-f1.js';

export function generateFloorMap(run,depthCount=8){
  const nodes=[]; const edges={};
  for(let depth=1;depth<=depthCount;depth++){
    const count=depth===depthCount?1:2;
    const pair=F1_MAP_LAYOUT[(depth-1)%F1_MAP_LAYOUT.length]||['NORMAL_COMBAT','EVENT'];
    const swapped=count===2&&choose(run,[false,true],`map-lane-swap:${run.floor}:${depth}`);
    for(let lane=0;lane<count;lane++){
      const id=`f${run.floor}-d${depth}-n${lane}`;
      let type='BOSS';
      if(depth!==depthCount)type=pair[swapped?1-lane:lane]||pair[0];
      nodes.push({id,depth,type});
    }
  }
  for(let depth=1;depth<depthCount;depth++){
    const from=nodes.filter(n=>n.depth===depth), to=nodes.filter(n=>n.depth===depth+1);
    for(let i=0;i<from.length;i++){
      const first=to[Math.min(i,to.length-1)].id;
      const list=[first];
      if(to.length>1&&to[1-Math.min(i,1)]?.id!==first)list.push(to[1-Math.min(i,1)].id);
      edges[from[i].id]=[...new Set(list)];
    }
  }
  return {
    depthCount,nodes,edges,currentNodeId:null,votes:{},voteRound:0,voteDeadline:null,
    bossId:F1_MONSTER_DEFINITIONS.f1_fallen_lord.id,
    bossName:F1_MONSTER_DEFINITIONS.f1_fallen_lord.name
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
  run.map.currentNodeId=winner; run.map.votes={}; run.map.voteRound+=1; run.map.voteDeadline=null;
  run.depth=run.map.nodes.find(n=>n.id===winner)?.depth||run.depth;
  return winner;
}
