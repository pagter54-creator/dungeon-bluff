// Route tests choose actual reachable paths; room types no longer have fixed depths.
import {connectedNodeIds} from '../../supabase/functions/game-api/pve/map.js';
export function chooseCoverageNode(run){
 const byId=new Map(run.map.nodes.map(n=>[n.id,n]));
 const types=['NORMAL_COMBAT','ELITE_COMBAT','EVENT','REST','SHOP','REWARD_ROOM','BOSS'];
 const bit=type=>1<<types.indexOf(type),memo=new Map();
 const visited=(run.map.visitedNodeIds||[]).reduce((mask,id)=>mask|bit(byId.get(id).type),0);
 function best(id,mask){
  const key=id+':'+mask;if(memo.has(key))return memo.get(key);
  const n=byId.get(id),nextMask=mask|bit(n.type),next=run.map.edges[id]||[];
  const cost={NORMAL_COMBAT:3,ELITE_COMBAT:5,EVENT:1}[n.type]||0;
  const score=next.length?Math.max(...next.map(to=>best(to,nextMask)))-cost:types.filter((_,i)=>nextMask&(1<<i)).length*100-cost;
  memo.set(key,score);return score;
 }
 return connectedNodeIds(run.map).sort((a,b)=>best(b,visited)-best(a,visited)||a.localeCompare(b))[0];
}
