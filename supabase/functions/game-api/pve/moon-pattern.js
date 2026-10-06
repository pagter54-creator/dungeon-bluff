import {getPatternContributors} from './adaptive-pattern.js';
export const MOON_MAX_VALID_NUMBER_SUM_THRESHOLDS=Object.freeze({0:3,1:3,2:5,3:7,4:8});
export function moonMaxThreshold(run){return MOON_MAX_VALID_NUMBER_SUM_THRESHOLDS[Math.min(4,getPatternContributors(run).length)];}
export function moonValidNumberSum(cards){return cards.filter(c=>c.valid).reduce((n,c)=>n+c.finalNumber,0);}
export function moonMaxPassed(run,cards){return moonValidNumberSum(cards)<=moonMaxThreshold(run);}
