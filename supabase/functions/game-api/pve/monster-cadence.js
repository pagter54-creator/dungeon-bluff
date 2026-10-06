// Action clock is independent of combat.turn (reactive mechanics keep that clock).
export function cadenceTemplate(monster,turn){
 const source=monster.pattern||[],delay=Math.max(0,Number(monster.actionCadenceDelay)||0);
 const sequence=[];
 for(let index=0;index<source.length;index++){
  const action=source[index];
  if(['DIRECT_DAMAGE','AOE_DAMAGE'].includes(action.type))for(let n=0;n<delay;n++)sequence.push({type:'CHARGE',telegraphText:'공격 준비 · '+action.telegraphText,payload:{},cadenceTelegraph:true,sourcePatternIndex:index});
  sequence.push({...action,sourcePatternIndex:index});
 }
 return sequence.length?sequence[(turn-1)%sequence.length]:null;
}
