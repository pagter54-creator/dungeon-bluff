// Shared authoritative predicate, target ordering and public cue for F2_FLAME.
export function wispFlameRule(mode){
 const low=mode==='LOW';
 return {mode:low?'LOW':'HIGH',dangerRange:low?[4,6]:[1,3],
  isDanger:number=>low?number>=4:number<=3,
  numberOrder:(a,b)=>low?b.finalNumber-a.finalNumber:a.finalNumber-b.finalNumber,
  text:low?'낮은 불꽃 · 4~6 위험 · 최고 위험 숫자 1명 피해 1':'높은 불꽃 · 1~3 위험 · 최저 위험 숫자 1명 피해 1'};
}
export const WISP_FLAME_SUMMARY='낮은 불꽃: 4~6 중 최고 숫자 1명 · 높은 불꽃: 1~3 중 최저 숫자 1명 · 피해 1 · 동점은 앞자리 · 유효 여부 무관';
export function selectWispFlameTarget(run,cards,mode){
 const rule=wispFlameRule(mode),players=new Map(run.players.map(p=>[p.playerId,p]));
 const candidates=cards.filter(c=>players.has(c.playerId)&&players.get(c.playerId).status!=='DOWNED'&&rule.isDanger(c.finalNumber));
 candidates.sort((a,b)=>rule.numberOrder(a,b)||players.get(a.playerId).seat-players.get(b.playerId).seat||a.playerId.localeCompare(b.playerId));
 return {rule,candidates,selected:candidates[0]||null};
}
