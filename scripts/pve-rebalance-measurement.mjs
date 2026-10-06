// Offline instrumentation only. Never imported by game-api or production clients.
export function instrumentCombatSource(source){
 let s=source.replace('export function resolveBasicTurn(run){',
  'export function resolveBasicTurn(run){const measuredSubmissions=structuredClone(run.combat.turnSubmissions);let measuredAdaptive=null;');
 s=s.replace('  const monsterPattern=describeMonsterPattern(run,cards,totalDamage,events);',
  '  measuredAdaptive=globalThis.__balanceAdaptive?.(run,cards,totalDamage,events);const monsterPattern=describeMonsterPattern(run,cards,totalDamage,events);');
 let sites=0;
 s=s.replace(/(c\.publicTurnResult=buildTurnResult\([^;]*\);)/g,m=>{sites++;return m+'globalThis.__balanceObserve?.(run,c.publicTurnResult,measuredSubmissions,measuredAdaptive);';});
 if(sites!==4)throw new Error('COMBAT_OBSERVER_SITE_COUNT:'+sites);
 return s;
}
export function instrumentFlameSource(source){
 return source.replace(/run\.flame(?:-=1|=(?:Math\.[^;]+));/g,m=>
  '(()=>{const before=run.flame;'+m+'globalThis.__balanceFlame?.(run,before,run.flame);})();');
}
export function instrumentMonsterSource(source){
 const marker='  const intent=prepareMonsterAction(run,telegraph);';
 if(!source.includes(marker))throw new Error('MONSTER_ACTION_OBSERVER_SITE_MISSING');
 return source.replace(marker,marker+'globalThis.__balanceAction?.(run,intent);');
}
export function flameTransition(before,after){
 return {before,after,spent:Math.max(0,before-after),gained:Math.max(0,after-before)};
}
export function captureResolvedTurn(result,submissions,intent,adaptive){
 const r=structuredClone(result);
 for(const c of r.cards||[])c.diagnosticSkillIntent=Boolean(submissions[c.playerId]?.skillIntent);
 r.diagnosticIntent=structuredClone(intent);r.diagnosticAdaptive=structuredClone(adaptive);
 return r;
}
export function snapshotAdaptiveRequirement(run,cards=[],totalDamage=0,events=[]){
 const k=run.combat?.monster?.mechanic,meta=k?.adaptiveRequirement;if(!meta)return null;
 const contributorCount=run.players.filter(p=>p.status!=='DOWNED'&&p.canSubmitCard!==false).length;
 const baseRequirement=k[meta.field],n=Math.min(contributorCount,meta.baseContributors||4);
 const effectiveRequirement=Math.max(1,meta.table?.[n]??Math.ceil(baseRequirement*n/(meta.baseContributors||4)));
 const valid=cards.filter(c=>c.valid),s=run.combat.monster.behaviorState;
 let achieved=meta.field==='requiredValidCount'?valid.length:meta.field==='requiredDistinct'?new Set(valid.map(c=>c.finalNumber)).size:meta.field==='requiredSum'?valid.reduce((n,c)=>n+c.finalNumber,0):meta.field==='requiredHits'?s.progress:k.type==='DPS_WINDOW'?s.progress:totalDamage;
 let opportunity=true;
 if(k.type==='DPS_WINDOW')opportunity=s.countdown===0;
 if(k.type==='F3_EXECUTION')opportunity=Boolean(s.executionReady);
 if(k.type==='F2_MOON')opportunity=s.phase==='MIN';
 if(k.type==='F2_CHAOS')opportunity=s.chaosRule==='VALID_SUM';
 if(k.type==='F2_HYDRA')opportunity=s.heads>0||events.some(e=>e.type==='HYDRA_HEAD_REMOVED');
 if(['HUNT','COUNTDOWN_STRIKE','PARTY_ORDER'].includes(k.type))opportunity=['DIRECT_DAMAGE','AOE_DAMAGE'].includes(run.combat.monster.intent?.type);
 if(run.combat.monster.hp<=0)opportunity=false;
 return {type:meta.type,field:meta.field,baseRequirement,effectiveRequirement,contributorCount,adaptivePatternApplied:effectiveRequirement!==baseRequirement,achieved,opportunity,patternSuccess:achieved>=effectiveRequirement,beforeEquivalentSuccess:achieved>=baseRequirement};
}
// Submission skills: final validity. Immediate skills: accepted activation, tracked
// separately; this does not claim a prediction later succeeded or a heal had value.
export function submittedSkillOutcome(card){
 return !card.diagnosticSkillIntent?null:card.valid?'SUCCESS':'FAILURE';
}
