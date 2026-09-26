import {recordRngTelemetry} from './telemetry.js';
// Deterministic PVE RNG. Every draw consumes exactly one counter value.
function hash32(text){
  let h=2166136261>>>0;
  for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)>>>0;}
  h+=h<<13;h^=h>>>7;h+=h<<3;h^=h>>>17;h+=h<<5;
  return h>>>0;
}
export function deterministicFloat(seed,counter,contextKey=''){
  return hash32(`${seed}|${counter}|${contextKey}`)/4294967296;
}
export function drawIndex(run,length,contextKey){
  if(!Number.isInteger(length)||length<=0)throw new Error('RNG length must be positive.');
  const counter=run.rngCounter;
  const index=Math.floor(deterministicFloat(run.seed,counter,contextKey)*length);
  run.rngCounter+=1;
  recordRngTelemetry(run,{contextKey,counter,index,length});
  return {index,counter};
}
export function choose(run,items,contextKey){
  return items[drawIndex(run,items.length,contextKey).index];
}
