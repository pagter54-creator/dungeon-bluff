import {selectFloorMonster} from './monster-selection.js';
import {WISP_FLAME_SUMMARY} from './wisp-flame.js';
import {choose} from './rng.js';

const hit=(text)=>[{type:'CHARGE',telegraphText:text,payload:{}},{type:'DIRECT_DAMAGE',telegraphText:'한 명을 공격한다',payload:{target:'RANDOM_LIVING',amount:1}}];
const bossPattern=(text)=>[
  {type:'CHARGE',telegraphText:text,payload:{}},
  {type:'DIRECT_DAMAGE',telegraphText:'한 명을 공격한다',payload:{target:'RANDOM_LIVING',amount:1}},
  {type:'CHARGE',telegraphText:text,payload:{}},
  {type:'CHARGE',telegraphText:text,payload:{}},
  {type:'AOE_DAMAGE',telegraphText:'전원에게 압박을 가한다',payload:{amount:1}}
];
export const F2_MONSTER_DEFINITIONS=Object.freeze({
  f2_cursed_prophet:{id:'f2_cursed_prophet',name:'저주받은 예언자',floor:2,tier:'NORMAL',baseHp:120,tags:['F2','CURSE'],mechanic:{type:'F2_PROPHECY',threshold:2},ruleSummary:'다음 턴 저주 숫자를 미리 공개 · 그 턴 해당 최종 숫자면 저주 +1 · 2중첩 시 피해 1 후 초기화',pattern:hit('다음 턴의 저주 숫자를 예언한다')},
  f2_hungry_slime:{id:'f2_hungry_slime',name:'굶주린 슬라임',floor:2,tier:'NORMAL',baseHp:120,tags:['F2','GROWTH'],mechanic:{type:'F2_GROWTH',minimumDamage:8},ruleSummary:'이번 턴 파티 피해 8 미만이면 성장 +1 · 성장 2 이상이면 단일 공격 피해 +1 후 초기화',pattern:hit('약한 공격을 삼킬 준비를 한다')},
  f2_spore_acolyte:{id:'f2_spore_acolyte',name:'포자 시종',floor:2,tier:'NORMAL',baseHp:120,tags:['F2','SPORE'],mechanic:{type:'F2_SPORE',threshold:2},ruleSummary:'중복으로 무효가 된 플레이어는 포자 +1 · 2중첩 시 피해 1 후 초기화',pattern:hit('포자를 흩뿌린다')},
  f2_swamp_leech:{id:'f2_swamp_leech',name:'늪지 흡혈충',floor:2,tier:'NORMAL',baseHp:120,tags:['F2','DRAIN'],mechanic:{type:'F2_LEECH',heal:3},ruleSummary:'공개된 표적이 유효 공격에 실패하면 피해 1 · 흡혈충 HP 3 회복',pattern:hit('흡혈 표적을 고른다')},
  f2_mycelium_doppelganger:{id:'f2_mycelium_doppelganger',name:'균사 도플갱어',floor:2,tier:'NORMAL',baseHp:120,tags:['F2','COPY'],mechanic:{type:'F2_COPY',damagePenalty:2},ruleSummary:'직전 턴 복제한 유효 최종 숫자를 다시 쓰면 그 카드 피해 -2',pattern:hit('직전 숫자를 복제한다')},
  f2_wisp_lamplighter:{id:'f2_wisp_lamplighter',name:'늪불 등불지기',floor:2,tier:'NORMAL',baseHp:120,tags:['F2','FLAME'],mechanic:{type:'F2_FLAME'},ruleSummary:WISP_FLAME_SUMMARY,pattern:hit('늪불의 높이를 바꾼다')},
  f2_thorn_dryad:{id:'f2_thorn_dryad',name:'가시 드라이어드',floor:2,tier:'NORMAL',baseHp:120,tags:['F2','THORNS'],mechanic:{type:'F2_THORNS'},ruleSummary:'가시 활성 턴에는 단독 최고 유효 최종 숫자 플레이어가 반격 피해 1',pattern:hit('가시를 세운다')},
  f2_chaos_goblin:{id:'f2_chaos_goblin',name:'혼돈 고블린',floor:2,tier:'ELITE',baseHp:200,tags:['F2','CHAOS'],mechanic:{type:'F2_CHAOS'},ruleSummary:'공개된 혼돈 규칙에 따라 카드 피해 -1 또는 괴물 압박 +1',pattern:hit('혼돈 규칙을 공개한다')},
  f2_rootjaw_hydra:{id:'f2_rootjaw_hydra',name:'뿌리턱 히드라',floor:2,tier:'ELITE',baseHp:200,tags:['F2','HEADS'],mechanic:{type:'F2_HYDRA',heads:3,requiredDistinct:3},ruleSummary:'서로 다른 유효 최종 숫자 3종 이상이면 머리 1개 제거 · 머리 2개 이상이면 단일 공격 피해 +1',pattern:hit('남은 머리가 공격을 준비한다')},
  f2_thread_witch:{id:'f2_thread_witch',name:'실타래 마녀',floor:2,tier:'ELITE',baseHp:200,tags:['F2','THREAD'],mechanic:{type:'F2_THREAD'},ruleSummary:'공개된 두 플레이어는 다음 턴 서로 다른 최종 숫자로 실타래를 끊어야 함 · 같으면 각각 피해 1',pattern:hit('두 플레이어를 실타래로 잇는다')},
  f2_rottenheart_ancient:{id:'f2_rottenheart_ancient',name:'썩은심장 고목',floor:2,tier:'BOSS',baseHp:290,tags:['F2','BOSS','CORRUPTION'],mechanic:{type:'F2_CORRUPTION',threshold:3},ruleSummary:'자신의 직전 유효 최종 숫자를 다시 유효하게 사용하면 오염 +1 · 3중첩 시 피해 1 후 초기화',pattern:bossPattern('오염된 뿌리가 움직인다')},
  f2_moon_eating_witch:{id:'f2_moon_eating_witch',name:'달을 삼킨 마녀',floor:2,tier:'BOSS',baseHp:290,tags:['F2','BOSS','MOON'],mechanic:{type:'F2_MOON',minimumDamage:10,maximumDamage:7},ruleSummary:'만월에는 파티 피해 10 이상 · 신월에는 7 이하 · 실패 시 표적 피해 1',pattern:bossPattern('달의 위상이 바뀐다')}
});
// Base content values are preserved; runtime declares its two independent layers.
for(const monster of Object.values(F2_MONSTER_DEFINITIONS))monster.actionCadenceDelay=1;
F2_MONSTER_DEFINITIONS.f2_hungry_slime.mechanic.adaptiveRequirement={type:'PARTY_SUM_OR_DAMAGE_REQUIREMENT',field:'minimumDamage',baseContributors:4};
F2_MONSTER_DEFINITIONS.f2_chaos_goblin.mechanic.adaptiveRequirement={type:'PARTY_SUM_OR_DAMAGE_REQUIREMENT',field:'requiredSum',baseContributors:4};
F2_MONSTER_DEFINITIONS.f2_rootjaw_hydra.mechanic.adaptiveRequirement={type:'DISTINCT_COUNT_REQUIREMENT',field:'requiredDistinct',baseContributors:4,table:{1:1,2:2,3:3,4:3}};
F2_MONSTER_DEFINITIONS.f2_moon_eating_witch.mechanic.adaptiveRequirement={type:'PARTY_SUM_OR_DAMAGE_REQUIREMENT',field:'minimumDamage',baseContributors:4};
F2_MONSTER_DEFINITIONS.f2_chaos_goblin.mechanic.requiredSum=10;


export function f2MonsterById(id){return F2_MONSTER_DEFINITIONS[id]||null;}
export function selectF2Monster(run,roomType){
 const key='f2-monster';
 return selectFloorMonster(run,2,roomType,key+':'+run.floor+':'+run.depth+':'+(run.currentRoomNodeId||'unknown'));
}
