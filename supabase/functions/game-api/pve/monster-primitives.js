// Monster handlers can use these state transitions after the existing damage batch.
// Balance values and the decision about which submitted number is relevant belong to content definitions.
export function trackPlayerNumber(state,playerId,number){
  if(typeof playerId!=='string'||!Number.isInteger(number))throw new Error('Invalid tracked monster number.');
  state.lastNumberByPlayer||={};
  const previous=state.lastNumberByPlayer[playerId]??null;
  state.lastNumberByPlayer[playerId]=number;
  return {playerId,number,previous,repeated:previous===number};
}

export function changeMonsterStack(state,key,delta,{minimum=0,maximum=Infinity}={}){
  if(typeof key!=='string'||!key||!Number.isInteger(delta)||!Number.isInteger(minimum)||!(Number.isInteger(maximum)||maximum===Infinity)||maximum<minimum)throw new Error('Invalid monster stack change.');
  state.stacks||={};
  const before=Math.max(minimum,Number(state.stacks[key])||0);
  const after=Math.max(minimum,Math.min(maximum,before+delta));
  state.stacks[key]=after;
  return {key,before,after};
}

export function checkPartyDamage(total,{minimum=null,maximum=null}={}){
  if(!Number.isFinite(total)||total<0||minimum!=null&&(!Number.isFinite(minimum)||minimum<0)||maximum!=null&&(!Number.isFinite(maximum)||maximum<0))throw new Error('Invalid party damage check.');
  return {total,minimum,maximum,passed:(minimum==null||total>=minimum)&&(maximum==null||total<=maximum)};
}

export function advanceMonsterPhase(state,phases){
  if(!Array.isArray(phases)||phases.length<2||new Set(phases).size!==phases.length)throw new Error('Invalid monster phase sequence.');
  const index=phases.indexOf(state.phase);
  state.phase=phases[(index+1)%phases.length];
  return state.phase;
}

export function tickMonsterCountdown(state,key='countdown'){
  const before=state[key];
  if(!Number.isInteger(before)||before<0)throw new Error('Invalid monster countdown.');
  state[key]=Math.max(0,before-1);
  return {before,after:state[key],ready:state[key]===0};
}
