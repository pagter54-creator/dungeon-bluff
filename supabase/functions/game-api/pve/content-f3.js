import {choose} from './rng.js';
const hit=t=>[{type:'CHARGE',telegraphText:t,payload:{}},{type:'DIRECT_DAMAGE',telegraphText:'한 명을 공격한다',payload:{target:'RANDOM_LIVING',amount:1}}];
const boss=t=>[...hit(t),{type:'CHARGE',telegraphText:t,payload:{}},{type:'AOE_DAMAGE',telegraphText:'전원에게 공격한다',payload:{amount:1}}];
export const F3_MONSTER_DEFINITIONS=Object.freeze({
 f3_greed_mimic:{id:'f3_greed_mimic',name:'탐욕의 미믹',floor:3,tier:'NORMAL',baseHp:160,mechanic:{type:'F3_GREED'},ruleSummary:'탐욕 활성 턴 단독 최고 유효 숫자 플레이어에게 피해 1',pattern:hit('탐욕의 입을 연다')},
 f3_royal_tax_collector:{id:'f3_royal_tax_collector',name:'왕실 세금징수관',floor:3,tier:'NORMAL',baseHp:160,mechanic:{type:'F3_TAX',requiredSum:10},ruleSummary:'유효 숫자 합 10 미만이면 공개 표적 Run Gold 최대 1 징수',pattern:hit('세금 조건을 제시한다')},
 f3_abyss_duelist:{id:'f3_abyss_duelist',name:'심연의 결투가',floor:3,tier:'NORMAL',baseHp:160,mechanic:{type:'F3_DUEL',threshold:3},ruleSummary:'공개 표적이 유효 최종 숫자 4 이상을 내지 못하면 피해 1',pattern:hit('결투 상대를 지목한다')},
 f3_black_choir:{id:'f3_black_choir',name:'검은 성가대',floor:3,tier:'NORMAL',baseHp:160,mechanic:{type:'F3_CHOIR',requiredDistinct:3},ruleSummary:'서로 다른 유효 숫자 3종 미만이면 전원 피해 1',pattern:hit('세 음의 화음을 기다린다')},
 f3_skillfeed_familiar:{id:'f3_skillfeed_familiar',name:'기술먹이 사역마',floor:3,tier:'NORMAL',baseHp:160,mechanic:{type:'F3_SKILL_FEED',threshold:2},ruleSummary:'활성 스킬 사용마다 기술먹이 +1 · 2중첩이면 다음 공격 +1',pattern:hit('활성 기술의 흔적을 먹는다')},
 f3_abyss_archivist:{id:'f3_abyss_archivist',name:'심연의 기록관',floor:3,tier:'NORMAL',baseHp:160,mechanic:{type:'F3_ARCHIVIST'},ruleSummary:'최근 2턴 최빈 유효 숫자의 공격 피해 -1',pattern:hit('숫자를 기록한다')},
 f3_royal_appraiser:{id:'f3_royal_appraiser',name:'왕실 감정관',floor:3,tier:'NORMAL',baseHp:160,mechanic:{type:'F3_APPRAISAL'},ruleSummary:'공개 우대 범위 밖 유효 숫자의 공격 피해 -1',pattern:hit('숫자의 가치를 감정한다')},
 f3_execution_golem:{id:'f3_execution_golem',name:'처형 골렘',floor:3,tier:'ELITE',baseHp:280,mechanic:{type:'F3_EXECUTION',length:2,requiredHits:5},ruleSummary:'2턴 동안 유효 공격 5회면 처형 취소 · 실패 시 공개 표적 피해 2',pattern:hit('처형 대상을 겨눈다')},
 f3_abyss_auditor:{id:'f3_abyss_auditor',name:'심연의 감사관',floor:3,tier:'ELITE',baseHp:280,mechanic:{type:'F3_AUDIT',threshold:2},ruleSummary:'같은 유효 인원 반복으로 감사 +1 · 2중첩 시 공개 표적 피해 1',pattern:hit('유효 인원을 감사한다')},
 f3_null_choir_priest:{id:'f3_null_choir_priest',name:'무효의 종사제',floor:3,tier:'ELITE',baseHp:280,mechanic:{type:'F3_NULL'},ruleSummary:'이번 턴 공개된 홀수 또는 4~6 공격 피해 -1 · 완전 무효화 없음',pattern:hit('약화 조건을 선고한다')},
 f3_abyss_king:{id:'f3_abyss_king',name:'심연왕',floor:3,tier:'BOSS',baseHp:420,mechanic:{type:'F3_ADAPT',maximum:3},ruleSummary:'최근 3턴 최고 유효 숫자/유효 인원/피해 구간 반복을 학습 · 전략 변경 2턴이면 적응 -1',pattern:boss('파티 습관을 관찰한다')},
 f3_masked_queen:{id:'f3_masked_queen',name:'가면의 여왕',floor:3,tier:'BOSS',baseHp:420,mechanic:{type:'F3_MASK',masks:['SILENCE','GREED','HUMILITY','DISCORD']},ruleSummary:'가면 하나만 적용 · 침묵: 스킬 반격 / 탐욕: 최고 숫자 반격 / 겸손: 4~6 피해 -1 / 불화: 중복 시 방어 +1',pattern:boss('가면 규칙을 펼친다')}
});
// Base content values are preserved; runtime declares its two independent layers.
for(const monster of Object.values(F3_MONSTER_DEFINITIONS))monster.actionCadenceDelay=1;
F3_MONSTER_DEFINITIONS.f3_royal_tax_collector.mechanic.adaptiveRequirement={type:'PARTY_SUM_OR_DAMAGE_REQUIREMENT',field:'requiredSum',baseContributors:4};
F3_MONSTER_DEFINITIONS.f3_black_choir.mechanic.adaptiveRequirement={type:'DISTINCT_COUNT_REQUIREMENT',field:'requiredDistinct',baseContributors:4,table:{1:1,2:2,3:3,4:3}};
F3_MONSTER_DEFINITIONS.f3_execution_golem.mechanic.adaptiveRequirement={type:'WINDOW_HIT_REQUIREMENT',field:'requiredHits',baseContributors:4};

export function selectF3Monster(run,roomType){
 const tier=roomType==='BOSS'?'BOSS':roomType==='ELITE_COMBAT'?'ELITE':'NORMAL';
 if(!['BOSS','ELITE_COMBAT','NORMAL_COMBAT'].includes(roomType))throw new Error('전투방 타입이 아닙니다.');
 if(tier==='BOSS')return F3_MONSTER_DEFINITIONS[run.chosenBossIds?.[3]]||F3_MONSTER_DEFINITIONS.f3_abyss_king;
 const pool=Object.values(F3_MONSTER_DEFINITIONS).filter(x=>x.tier===tier&&!run.usedMonsterIds?.includes(x.id));
 if(!pool.length)throw new Error('Floor 3 고유 몬스터 풀이 소진되었습니다.');
 return choose(run,pool,'f3-monster:'+run.floor+':'+run.depth+':'+(run.currentRoomNodeId||'unknown'));
}
