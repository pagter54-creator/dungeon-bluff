// Only explicitly declared cooperative requirements adapt; content bases stay intact.
export function getPatternContributors(run){
 // STUNNED_NEXT_TURN still submits a server-selected, normally resolved card.
 return (run.players||[]).filter(p=>p.status!=='DOWNED'&&p.canSubmitCard!==false);
}
export function scalePatternRequirement(base,count,meta){
 const n=Math.max(0,Math.min(meta.baseContributors||4,count));
 return Math.max(1,meta.table?.[n]??Math.ceil(base*n/(meta.baseContributors||4)));
}
export function patternRequirement(run,field){
 const m=run.combat?.monster,k=m?.mechanic,meta=k?.adaptiveRequirement;
 const base=k?.[field]??(field==='requiredSum'&&k?.type==='F2_CHAOS'?10:undefined);
 if(!meta||meta.field!==field)return base;
 const contributorCount=getPatternContributors(run).length;
 const effectiveRequirement=scalePatternRequirement(base,contributorCount,meta);
 return effectiveRequirement;
}
export function adaptivePresentation(run){
 const meta=run.combat?.monster?.mechanic?.adaptiveRequirement;if(!meta)return {};
 const baseRequirement=run.combat.monster.mechanic[meta.field],effectiveRequirement=patternRequirement(run,meta.field);
 return {adaptiveRequirement:{type:meta.type,field:meta.field,baseRequirement,effectiveRequirement,contributorCount:getPatternContributors(run).length,adaptivePatternApplied:effectiveRequirement!==baseRequirement}};
}
export function adaptiveRuleSummary(run){
 const m=run.combat?.monster,k=m?.mechanic;if(!k?.adaptiveRequirement)return m?.ruleSummary||'';
 const x=patternRequirement(run,k.adaptiveRequirement.field);
 if(x===k[k.adaptiveRequirement.field])return m.ruleSummary||'';
 switch(k.type){
 case 'HUNT':return `유효 카드 ${x}장 이상이면 사냥 저지 · 중복 그룹 2개 이상이면 사냥 피해 2`;
 case 'COUNTDOWN_STRIKE':case 'PARTY_ORDER':return `유효 카드 ${x}장 이상이면 공격 저지`;
 case 'VALID_GUARD':return `유효 카드 ${x}장 미만이면 다음 턴 방어 +1`;
 case 'DOMINION':return `유효 카드 ${x}장 이상이면 지배 -1 · 미만이면 지배 +1`;
 case 'DPS_WINDOW':return `${k.length}턴 피해 ${x} 이상이면 성문 파쇄 저지`;
 case 'F2_GROWTH':return `파티 피해 ${x} 미만이면 성장 +1 · 성장 2 이상이면 단일 공격 피해 +1 후 초기화`;
 case 'F2_HYDRA':return `서로 다른 유효 숫자 ${x}종 이상이면 머리 1개 제거 · 머리 2개 이상이면 단일 공격 피해 +1`;
 case 'F2_CHAOS':return `혼돈: 홀수/낮은 숫자 또는 유효 숫자 합 ${x} 이상 · 실패 시 기존 약화/반격`;
 case 'F2_MOON':return `만월 파티 피해 ${x} 이상 · 신월 ${k.maximumDamage} 이하 · 실패 시 표적 피해 1`;
 case 'F3_TAX':return `유효 숫자 합 ${x} 미만이면 공개 표적 Run Gold 최대 1 징수`;
 case 'F3_CHOIR':return `서로 다른 유효 숫자 ${x}종 미만이면 전원 피해 1`;
 case 'F3_EXECUTION':return `${k.length}턴 유효 공격 ${x}회면 처형 취소 · 실패 시 공개 표적 피해 2`;
 default:return m.ruleSummary||'';
 }
}
