// Takes explicitly whitelisted public data and already legal owner candidates.
// No run, teammate selections, teammate private zones or future RNG enter here.
export function selectMoonPatternCandidate(publicState,candidates,baseline){
 if(publicState.monsterId!=='f2_moon_eating_witch'||!['MIN','MAX'].includes(publicState.phase)||!candidates.length)return baseline;
 const {phase,threshold,ownerSeat,teammatePools=[]}=publicState;
 const risk=number=>teammatePools.reduce((n,pool)=>n+pool.filter(x=>x===number).length/Math.max(1,pool.length),0);
 const score=c=>{
  const collision=c.collisionProtected?0:risk(c.finalNumber),cost=c.cost||0;
  if(phase==='MIN')return [collision,-Math.min(c.expectedDamage,threshold),cost,-c.finalNumber];
  // Max remains validity-aware: low final numbers have priority, with a public
  // collision penalty and stable seat diversification when utilities tie.
  return [c.finalNumber+collision*2,collision,cost,Math.abs(c.finalNumber-(ownerSeat%3+1))];
 };
 const ranked=candidates.map((c,i)=>({c,i,score:score(c)})).sort((a,b)=>{for(let i=0;i<a.score.length;i++){const d=a.score[i]-b.score[i];if(d)return d;}return a.i-b.i;});
 return {...ranked[0].c,patternAware:true,chosenCardRankForPattern:1,publicCollisionRisk:risk(ranked[0].c.finalNumber)};
}
