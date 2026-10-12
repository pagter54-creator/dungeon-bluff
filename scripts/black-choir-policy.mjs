// Offline diagnostic policies. No production module imports this file.
export const TEST_VERSION='007.1';
export function selectCoop(publicInput,candidates,intents=[]){
  if(publicInput.pattern!=='F3_CHOIR')return publicInput.baseline;
  const reserved=new Set(intents.map(x=>x.bucket));
  const risk=n=>publicInput.otherPoolCompositions.reduce((s,p)=>s+p.filter(x=>x===n).length/Math.max(1,p.length),0);
  const ranked=candidates.map(c=>({...c,rank:[Number(!reserved.has(c.finalNumber)),Number(c.collisionProtected),-risk(c.finalNumber),c.expectedDamage,-c.cost]}));
  ranked.sort((a,b)=>{for(let i=0;i<a.rank.length;i++)if(a.rank[i]!==b.rank[i])return b.rank[i]-a.rank[i];return a.cardId.localeCompare(b.cardId)||JSON.stringify(a.skillData).localeCompare(JSON.stringify(b.skillData));});
  return ranked[0];
}
export function jointSearch(options,evaluate,required,cap=512){
  let checked=0,incomplete=false,rngDependent=0,best=null,witness=null;
  const better=(a,b)=>!b||a.distinct>=required&&b.distinct<required||((a.distinct>=required)===(b.distinct>=required)&&(a.valid>b.valid||a.valid===b.valid&&(a.damage>b.damage||a.damage===b.damage&&a.cost<b.cost)));
  const visit=(i,plans)=>{
    if(i===options.length){if(checked>=cap){incomplete=true;return;}checked++;
      const result=evaluate(plans);if(result.rngDependent){rngDependent++;return;}
      const value={...result,plans};if(value.distinct>=required&&!witness)witness=value;if(better(value,best))best=value;return;
    }
    for(const option of options[i]){visit(i+1,[...plans,option]);if(incomplete)return;}
  };
  visit(0,[]);
  return {classification:witness?'LEGAL_SOLUTION_EXISTS':incomplete?'SEARCH_INCOMPLETE':rngDependent?'RNG_DEPENDENT':'NO_LEGAL_SOLUTION',checked,incomplete,rngDependent,best,witness};
}
