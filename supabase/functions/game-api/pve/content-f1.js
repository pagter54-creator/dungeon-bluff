import {selectFloorMonster} from './monster-selection.js';
import {choose} from './rng.js';

export const F1_MONSTER_DEFINITIONS=Object.freeze({
  f1_armored_boar:{
    id:'f1_armored_boar',name:'철갑 멧돼지',floor:1,tier:'NORMAL',baseHp:90,tags:['F1','ARMORED'],
    mechanic:{type:'ARMOR_VALID_HITS',initial:2,maximum:2,recover:1},ruleSummary:'유효 공격마다 철갑 1 감소 · 철갑이 있으면 해당 공격 피해 1 감소',
    pattern:[
      {type:'DEFEND',telegraphText:'철갑을 세워 다음 공격을 버틴다',payload:{amount:1}},
      {type:'CHARGE',telegraphText:'땅을 긁으며 돌진을 준비한다',payload:{}},
      {type:'DIRECT_DAMAGE',telegraphText:'한 명을 향해 돌진한다',payload:{target:'RANDOM_LIVING',amount:1}},
    ]
  },
  f1_coward_hunter:{
    id:'f1_coward_hunter',name:'비겁한 사냥꾼',floor:1,tier:'NORMAL',baseHp:90,tags:['F1','HUNTER'],
    mechanic:{type:'HUNT',requiredValidCount:3,collisionBoostAt:2},ruleSummary:'사냥감 공격 · 유효 카드 3장 이상이면 저지 · 중복 2장 이상이면 공격 강화',
    pattern:[
      {type:'CHARGE',telegraphText:'안전한 거리를 재며 빈틈을 노린다',payload:{}},
      {type:'DIRECT_DAMAGE',telegraphText:'한 명을 골라 기습한다',payload:{target:'RANDOM_LIVING',amount:1}},
      {type:'CHARGE',telegraphText:'다시 몸을 숨긴다',payload:{}},
    ]
  },
  f1_rusty_ballista:{
    id:'f1_rusty_ballista',name:'녹슨 발리스타',floor:1,tier:'NORMAL',baseHp:90,tags:['F1','COUNTDOWN'],
    mechanic:{type:'COUNTDOWN_STRIKE',length:3,requiredValidCount:3},ruleSummary:'3턴 장전 후 전원 공격 · 발사 턴 유효 카드 3장 이상이면 저지',
    pattern:[
      {type:'CHARGE',telegraphText:'발리스타를 장전한다',payload:{}},
      {type:'CHARGE',telegraphText:'조준을 마친다',payload:{}},
      {type:'AOE_DAMAGE',telegraphText:'발리스타가 발사된다',payload:{amount:1}}
    ]
  },
  f1_gate_guard_dog:{
    id:'f1_gate_guard_dog',name:'성문 경비견',floor:1,tier:'NORMAL',baseHp:90,tags:['F1','TARGET'],
    mechanic:{type:'LAST_HIGHEST_TARGET'},ruleSummary:'직전 턴 최고 유효 숫자 플레이어를 다음 공격 대상으로 기억',
    pattern:[{type:'DIRECT_DAMAGE',telegraphText:'위협 대상을 추격한다',payload:{target:'RANDOM_LIVING',amount:1}}]
  },
  f1_sewer_rat_swarm:{
    id:'f1_sewer_rat_swarm',name:'하수도 쥐떼',floor:1,tier:'NORMAL',baseHp:90,tags:['F1','COLLISION'],
    mechanic:{type:'COLLISION_STACK',threshold:2},ruleSummary:'중복 그룹마다 쥐떼 +1 · 중복 없는 턴 -1 · 2 이상이면 다음 공격 전원 피해',
    pattern:[
      {type:'CHARGE',telegraphText:'쥐떼가 무리를 모은다',payload:{}},
      {type:'DIRECT_DAMAGE',telegraphText:'쥐떼가 달려든다',payload:{target:'RANDOM_LIVING',amount:1}}
    ]
  },
  f1_graveyard_sentinel:{
    id:'f1_graveyard_sentinel',name:'묘지 파수병',floor:1,tier:'NORMAL',baseHp:90,tags:['F1','VALID_COUNT'],
    mechanic:{type:'VALID_GUARD',requiredValidCount:3,defense:1},ruleSummary:'유효 카드가 2장 이하이면 다음 턴 피해 감소 1',
    pattern:[
      {type:'CHARGE',telegraphText:'유효 공격 인원을 살핀다',payload:{}},
      {type:'DIRECT_DAMAGE',telegraphText:'파수병이 한 명을 공격한다',payload:{target:'RANDOM_LIVING',amount:1}}
    ]
  },
  f1_chain_jailer:{
    id:'f1_chain_jailer',name:'사슬 간수',floor:1,tier:'NORMAL',baseHp:90,tags:['F1','FORBIDDEN_NUMBER'],
    mechanic:{type:'FORBIDDEN_NUMBER',numbers:[1,2,3,4,5],damagePenalty:1},ruleSummary:'예고한 최종 숫자는 이번 턴 공격 피해 -1',
    pattern:[
      {type:'CHARGE',telegraphText:'금지 숫자를 선고한다',payload:{}},
      {type:'DIRECT_DAMAGE',telegraphText:'간수가 사슬을 휘두른다',payload:{target:'RANDOM_LIVING',amount:1}}
    ]
  },
  f1_echo_bat:{
    id:'f1_echo_bat',name:'메아리 박쥐',floor:1,tier:'ELITE',baseHp:160,tags:['F1','ELITE','ECHO'],
    mechanic:{type:'ECHO',threshold:2},ruleSummary:'직전 유효 숫자 반복 시 턴당 메아리 +1 · 반복 없으면 -1(최소 0) · 2 이상이면 광역 공격 강화',
    pattern:[
      {type:'CHARGE',telegraphText:'동굴을 울리는 초음파를 모은다',payload:{}},
      {type:'DIRECT_DAMAGE',telegraphText:'메아리를 따라 한 명에게 급강하한다',payload:{target:'RANDOM_LIVING',amount:1}},
      {type:'CHARGE',telegraphText:'천장으로 물러난다',payload:{}},
      {type:'CHARGE',telegraphText:'동굴 전체가 울리기 시작한다',payload:{}},
      {type:'AOE_DAMAGE',telegraphText:'메아리 충격파가 파티 전체를 덮친다',payload:{amount:1}},
      {type:'CHARGE',telegraphText:'다음 메아리를 준비한다',payload:{}},
    ]
  },
  f1_siege_captain:{
    id:'f1_siege_captain',name:'공성대장',floor:1,tier:'ELITE',baseHp:160,tags:['F1','ELITE','VALID_COUNT'],
    mechanic:{type:'PARTY_ORDER',requiredValidCount:3},ruleSummary:'공성 명령 턴 유효 카드 3장 이상이면 광역 공격 저지',
    pattern:[
      {type:'CHARGE',telegraphText:'공성 명령을 준비한다',payload:{}},
      {type:'AOE_DAMAGE',telegraphText:'유효 카드 3장 미만이면 전원 공격',payload:{amount:1}}
    ]
  },
  f1_iron_bell_keeper:{
    id:'f1_iron_bell_keeper',name:'철종지기',floor:1,tier:'ELITE',baseHp:160,tags:['F1','ELITE','PARITY'],
    mechanic:{type:'PARITY_BELL',damagePenalty:1},ruleSummary:'매 턴 홀수/짝수 종 교대 · 종과 다른 유효 숫자의 피해 -1 · 종 패널티만으로 피해 0 방지',
    pattern:[
      {type:'CHARGE',telegraphText:'철종이 울린다',payload:{}},
      {type:'DIRECT_DAMAGE',telegraphText:'종지기가 한 명을 공격한다',payload:{target:'RANDOM_LIVING',amount:1}}
    ]
  },
  f1_fallen_lord:{
    id:'f1_fallen_lord',name:'몰락한 성주',floor:1,tier:'BOSS',baseHp:240,tags:['F1','BOSS'],
    mechanic:{type:'DOMINION',initial:1,maximum:3,requiredValidCount:3},ruleSummary:'매 턴 유효 카드 3장 이상이면 지배 -1 · 부족하면 +1 · 지배가 행동 강화',
    pattern:[
      {type:'CHARGE',telegraphText:'무너진 왕좌의 힘을 끌어모은다',payload:{}},
      {type:'DIRECT_DAMAGE',telegraphText:'성주의 검이 한 명을 겨눈다',payload:{target:'RANDOM_LIVING',amount:1}},
      {type:'DEFEND',telegraphText:'낡은 성벽의 잔해로 몸을 감싼다',payload:{amount:1}},
      {type:'CHARGE',telegraphText:'검은 기운이 홀 안에 퍼진다',payload:{}},
      {type:'CHARGE',telegraphText:'몰락의 파동이 서서히 번진다',payload:{}},
      {type:'CHARGE',telegraphText:'성의 잔향을 끌어모은다',payload:{}},
      {type:'HEAL',telegraphText:'잔향을 흡수해 상처를 조금 회복한다',payload:{amount:1}},
      {type:'CHARGE',telegraphText:'왕좌 주변의 기운이 흔들린다',payload:{}},
      {type:'CHARGE',telegraphText:'홀 전체에 균열이 번진다',payload:{}},
      {type:'AOE_DAMAGE',telegraphText:'몰락의 파동이 파티 전체를 덮친다',payload:{amount:1}},
      {type:'CHARGE',telegraphText:'성주가 자세를 고쳐 잡는다',payload:{}},
      {type:'CHARGE',telegraphText:'다음 검격을 준비한다',payload:{}},
    ]
  },
  f1_gatebreaker_colossus:{
    id:'f1_gatebreaker_colossus',name:'성문 파쇄 거상',floor:1,tier:'BOSS',baseHp:240,tags:['F1','BOSS','DPS_CHECK'],
    mechanic:{type:'DPS_WINDOW',length:3,minimumDamage:30},ruleSummary:'3턴 동안 파티 피해 30 이상이면 성문 파쇄 저지 · 실패하면 전원 피해 1',
    pattern:[{type:'CHARGE',telegraphText:'성문 파쇄를 준비한다',payload:{}}]
  }
});
// Base content values are preserved; runtime declares its two independent layers.
for(const monster of Object.values(F1_MONSTER_DEFINITIONS))monster.actionCadenceDelay=1;
F1_MONSTER_DEFINITIONS.f1_coward_hunter.mechanic.adaptiveRequirement={type:'PLAYER_COUNT_REQUIREMENT',field:'requiredValidCount',baseContributors:4,table:{1:1,2:2,3:3,4:3}};
F1_MONSTER_DEFINITIONS.f1_rusty_ballista.mechanic.adaptiveRequirement={type:'PLAYER_COUNT_REQUIREMENT',field:'requiredValidCount',baseContributors:4,table:{1:1,2:2,3:3,4:3}};
F1_MONSTER_DEFINITIONS.f1_siege_captain.mechanic.adaptiveRequirement={type:'PLAYER_COUNT_REQUIREMENT',field:'requiredValidCount',baseContributors:4,table:{1:1,2:2,3:3,4:3}};
F1_MONSTER_DEFINITIONS.f1_graveyard_sentinel.mechanic.adaptiveRequirement={type:'PLAYER_COUNT_REQUIREMENT',field:'requiredValidCount',baseContributors:4,table:{1:1,2:2,3:3,4:3}};
F1_MONSTER_DEFINITIONS.f1_fallen_lord.mechanic.adaptiveRequirement={type:'PLAYER_COUNT_REQUIREMENT',field:'requiredValidCount',baseContributors:4,table:{1:1,2:2,3:3,4:3}};
F1_MONSTER_DEFINITIONS.f1_gatebreaker_colossus.mechanic.adaptiveRequirement={type:'PARTY_SUM_OR_DAMAGE_REQUIREMENT',field:'minimumDamage',baseContributors:4};


export const F1_EVENT_DEFINITIONS=Object.freeze([
  {
    id:'f1_abandoned_camp',name:'버려진 야영지',illustration:'shared_supplies',
    description:'남겨진 물자를 살핍니다. 누가 가장 먼저 쓸 만한 물건을 찾을까요?',
    ruleSummary:'최고 유효 숫자: +3G · 최저 유효 숫자: HP -1 · 중복: 무효',
    resolutionType:'HIGHEST_LOWEST',
    successCondition:{primitive:'VALID_COUNT',gte:1},
    allCollide:{outcome:'ALL_COLLIDE',rules:[]},
    rules:[
      {when:'SUCCESS',target:'HIGHEST_VALID',effects:[{type:'ADD_RUN_GOLD',amount:3}]},
      {when:'SUCCESS',target:'LOWEST_VALID',effects:[{type:'DAMAGE_HP',amount:1}]}
    ],
    // Kept only so a run saved under the earlier choice-based version can finish.
    options:[
      {id:'patch_up',label:'남은 붕대로 상처를 돌본다',result:[{type:'HEAL',amount:1}]},
      {id:'search_supplies',label:'쓸 만한 물자를 챙긴다',result:[{type:'ADD_RUN_GOLD',amount:1}]}
    ]
  },
  {
    id:'f1_weathered_shrine',name:'풍화된 제단',illustration:'ancient_gate',
    description:'희미한 문양에 힘을 모읍니다. 유효한 숫자의 합으로 제단을 깨우세요.',
    ruleSummary:'유효 숫자 합 10 이상: 파티 Flame +1 · 실패: 최고 유효 카드 EXP +1 · 전원 중복: 실패',
    resolutionType:'VALID_SUM',threshold:10,
    successCondition:{primitive:'ABOVE_THRESHOLD'},
    allCollide:{outcome:'ALL_COLLIDE',rules:[]},
    rules:[
      {when:'SUCCESS',target:'PARTY',effects:[{type:'ADD_FLAME',amount:1}]},
      {when:'FAILURE',target:'HIGHEST_VALID',effects:[{type:'ADD_EXP',amount:1}]}
    ],
    options:[
      {id:'study_marks',label:'희미한 문양을 기록한다',result:[{type:'ADD_EXP',amount:2}]},
      {id:'rest_by_shrine',label:'제단 곁에서 잠시 쉰다',result:[{type:'HEAL',amount:1}]}
    ]
  }
]);

export const F1_RELIC_DEFINITIONS=Object.freeze([
  {id:'f1_worn_whetstone',name:'닳은 숫돌',pool:'GENERAL',betaPrice:4,effects:[
    {id:'f1_worn_whetstone_fx',trigger:'BEFORE_DAMAGE',priority:50,maxTriggers:1,resetScope:'TURN',operations:[{type:'MODIFY_DAMAGE',amount:1}]}
  ]},
  {id:'f1_guard_charm',name:'수호 부적',pool:'GENERAL',betaPrice:4,effects:[
    {id:'f1_guard_charm_fx',trigger:'COMBAT_START',priority:50,maxTriggers:1,resetScope:'COMBAT',operations:[{type:'ADD_ARMOR',amount:1}]}
  ]},
  {id:'f1_field_bandage',name:'야전 붕대',pool:'GENERAL',betaPrice:4,effects:[
    {id:'f1_field_bandage_fx',trigger:'MONSTER_KILLED',priority:50,maxTriggers:1,resetScope:'COMBAT',operations:[{type:'HEAL',amount:1}]}
  ]},
  {id:'f1_explorer_ledger',name:'탐험 기록장',pool:'GENERAL',betaPrice:4,effects:[
    {id:'f1_explorer_ledger_fx',trigger:'MONSTER_KILLED',priority:60,maxTriggers:1,resetScope:'COMBAT',operations:[{type:'ADD_EXP',amount:2}]}
  ]},
  {id:'f1_copper_purse',name:'구리 동전 주머니',pool:'GENERAL',betaPrice:4,effects:[
    {id:'f1_copper_purse_fx',trigger:'MONSTER_KILLED',priority:60,maxTriggers:1,resetScope:'COMBAT',operations:[{type:'ADD_RUN_GOLD',amount:1}]}
  ]},
  {id:'f1_lucky_feather',name:'행운의 깃털',pool:'GENERAL',betaPrice:4,effects:[
    {id:'f1_lucky_feather_fx',trigger:'BEFORE_DAMAGE',priority:55,maxTriggers:1,resetScope:'COMBAT',operations:[{type:'MODIFY_DAMAGE',amount:2}]}
  ]},
  {id:'f1_reinforced_plate',name:'보강 철판',pool:'SHOP_EXCLUSIVE',betaPrice:5,effects:[
    {id:'f1_reinforced_plate_fx',trigger:'COMBAT_START',priority:50,maxTriggers:1,resetScope:'COMBAT',operations:[{type:'ADD_ARMOR',amount:2}]}
  ]},
  {id:'f1_golden_compass',name:'황금 나침반',pool:'SHOP_EXCLUSIVE',betaPrice:5,effects:[
    {id:'f1_golden_compass_fx',trigger:'MONSTER_KILLED',priority:60,maxTriggers:1,resetScope:'COMBAT',operations:[{type:'ADD_RUN_GOLD',amount:2}]}
  ]}
]);

export const F1_MAP_LAYOUT=Object.freeze([
  ['NORMAL_COMBAT','NORMAL_COMBAT'],
  ['EVENT','REST'],
  ['NORMAL_COMBAT','SHOP'],
  ['ELITE_COMBAT','EVENT'],
  ['REST','REWARD_ROOM'],
  ['NORMAL_COMBAT','EVENT'],
  ['SHOP','REWARD_ROOM'],
  ['NORMAL_COMBAT','EVENT'],
  ['EVENT','REST'],
  ['NORMAL_COMBAT','SHOP'],
  ['ELITE_COMBAT','REWARD_ROOM'],
]);

export function f1MonsterById(id){return F1_MONSTER_DEFINITIONS[id]||null;}
export function selectF1Monster(run,roomType){
 const key=roomType==='ELITE_COMBAT'?'f1-elite':'f1-monster';
 return selectFloorMonster(run,1,roomType,key+':'+run.floor+':'+run.depth+':'+(run.currentRoomNodeId||'unknown'));
}
export function markF1MonsterUsed(run,monster){
  run.usedMonsterIds||=[];
  if(!run.usedMonsterIds.includes(monster.id))run.usedMonsterIds.push(monster.id);
}
export function selectF1Event(run){
  return choose(run,F1_EVENT_DEFINITIONS,`f1-event:${run.floor}:${run.depth}:${run.currentRoomNodeId||'unknown'}`);
}
