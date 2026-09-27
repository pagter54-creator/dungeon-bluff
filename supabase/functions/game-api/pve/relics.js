export function validateRelicCatalog(definitions){
  const ids=new Set();
  for(const def of definitions||[]){
    if(!def?.id||!def?.name||!['GENERAL','SHOP_EXCLUSIVE'].includes(def.pool))throw new Error('잘못된 유물 정의입니다.');
    if(ids.has(def.id))throw new Error('유물 ID가 중복되었습니다.');
    ids.add(def.id);
    if(!Array.isArray(def.effects))throw new Error('유물 effects 배열이 필요합니다.');
  }
  return true;
}
export function relicCatalogMap(definitions){
  validateRelicCatalog(definitions);
  return Object.fromEntries(definitions.map(x=>[x.id,x]));
}
export function relicPool(definitions,pool){
  validateRelicCatalog(definitions);
  return definitions.filter(x=>x.pool===pool);
}
export function installRelicCatalog(run,definitions){
  validateRelicCatalog(definitions);
  run.relicCatalog=definitions.map(x=>structuredClone(x));
  run.effectCatalog||={};
  for(const def of definitions)run.effectCatalog[def.id]={effects:structuredClone(def.effects||[])};
}
