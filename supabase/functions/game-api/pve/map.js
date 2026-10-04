import {choose} from './rng.js';
import {F1_MAP_LAYOUT,F1_MONSTER_DEFINITIONS} from './content-f1.js';
import {F2_MONSTER_DEFINITIONS} from './content-f2.js';
import {F3_MONSTER_DEFINITIONS} from './content-f3.js';
const F3_MAP_LAYOUT=Object.freeze([['NORMAL_COMBAT','NORMAL_COMBAT'],['EVENT','REST'],['NORMAL_COMBAT','SHOP'],['ELITE_COMBAT','EVENT'],['REST','REWARD_ROOM'],['SHOP','NORMAL_COMBAT'],['NORMAL_COMBAT','EVENT'],['REWARD_ROOM','REST'],['ELITE_COMBAT','SHOP']]);

export function generateFloorMap(run,depthCount=8){
  const nodes=[]; const edges={};
  for(let depth=1;depth<=depthCount;depth++){
    const count=depth===depthCount?1:run.floor===3?2:depth%3===1?2:1;
    const layout=run.floor===3?F3_MAP_LAYOUT:F1_MAP_LAYOUT;
    const pair=layout[(depth-1)%layout.length]||['NORMAL_COMBAT','EVENT'];
    const swapped=count===2&&choose(run,[false,true],`map-lane-swap:${run.floor}:${depth}`);
    for(let lane=0;lane<count;lane++){
      const id=`f${run.floor}-d${depth}-n${lane}`;
      let type='BOSS';
      if(depth!==depthCount)type=run.floor!==3&&count===1&&depth===3?pair[1]||pair[0]:pair[swapped?1-lane:lane]||pair[0];
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
  const f3Boss=F3_MONSTER_DEFINITIONS[run.chosenBossIds?.[3]]||F3_MONSTER_DEFINITIONS.f3_abyss_king;
  return {
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
