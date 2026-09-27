import {choose} from './rng.js';

export const F1_MONSTER_DEFINITIONS=Object.freeze({
  f1_armored_boar:{
    id:'f1_armored_boar',name:'철갑 멧돼지',floor:1,tier:'NORMAL',baseHp:75,tags:['F1','ARMORED'],
    pattern:[
      {type:'DEFEND',telegraphText:'철갑을 세워 다음 공격을 버틴다',payload:{amount:1}},
      {type:'CHARGE',telegraphText:'땅을 긁으며 돌진을 준비한다',payload:{}},
      {type:'DIRECT_DAMAGE',telegraphText:'한 명을 향해 돌진한다',payload:{target:'RANDOM_LIVING',amount:1}},
    ]
  },
  f1_coward_hunter:{
    id:'f1_coward_hunter',name:'비겁한 사냥꾼',floor:1,tier:'NORMAL',baseHp:75,tags:['F1','HUNTER'],
    pattern:[
      {type:'CHARGE',telegraphText:'안전한 거리를 재며 빈틈을 노린다',payload:{}},
      {type:'DIRECT_DAMAGE',telegraphText:'한 명을 골라 기습한다',payload:{target:'RANDOM_LIVING',amount:1}},
      {type:'CHARGE',telegraphText:'다시 몸을 숨긴다',payload:{}},
    ]
  },
  f1_echo_bat:{
    id:'f1_echo_bat',name:'메아리 박쥐',floor:1,tier:'ELITE',baseHp:120,tags:['F1','ELITE','ECHO'],
    pattern:[
      {type:'CHARGE',telegraphText:'동굴을 울리는 초음파를 모은다',payload:{}},
      {type:'DIRECT_DAMAGE',telegraphText:'메아리를 따라 한 명에게 급강하한다',payload:{target:'RANDOM_LIVING',amount:1}},
      {type:'CHARGE',telegraphText:'천장으로 물러난다',payload:{}},
      {type:'CHARGE',telegraphText:'동굴 전체가 울리기 시작한다',payload:{}},
      {type:'AOE_DAMAGE',telegraphText:'메아리 충격파가 파티 전체를 덮친다',payload:{amount:1}},
      {type:'CHARGE',telegraphText:'다음 메아리를 준비한다',payload:{}},
    ]
  },
  f1_fallen_lord:{
    id:'f1_fallen_lord',name:'몰락한 성주',floor:1,tier:'BOSS',baseHp:180,tags:['F1','BOSS'],
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
  }
});

export const F1_EVENT_DEFINITIONS=Object.freeze([
  {
    id:'f1_abandoned_camp',name:'버려진 야영지',
    options:[
      {id:'patch_up',label:'남은 붕대로 상처를 돌본다',result:[{type:'HEAL',amount:1}]},
      {id:'search_supplies',label:'쓸 만한 물자를 챙긴다',result:[{type:'ADD_RUN_GOLD',amount:1}]},
    ]
  },
  {
    id:'f1_weathered_shrine',name:'풍화된 제단',
    options:[
      {id:'study_marks',label:'희미한 문양을 기록한다',result:[{type:'ADD_EXP',amount:2}]},
      {id:'rest_by_shrine',label:'제단 곁에서 잠시 쉰다',result:[{type:'HEAL',amount:1}]},
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
  if(roomType==='BOSS')return F1_MONSTER_DEFINITIONS.f1_fallen_lord;
  if(roomType==='ELITE_COMBAT')return F1_MONSTER_DEFINITIONS.f1_echo_bat;
  if(roomType!=='NORMAL_COMBAT')throw new Error('전투방 타입이 아닙니다.');
  const pool=[F1_MONSTER_DEFINITIONS.f1_armored_boar,F1_MONSTER_DEFINITIONS.f1_coward_hunter];
  const unseen=pool.filter(x=>!(run.usedMonsterIds||[]).includes(x.id));
  const source=unseen.length?unseen:pool;
  return choose(run,source,`f1-monster:${run.floor}:${run.depth}:${run.currentRoomNodeId||'unknown'}`);
}
export function markF1MonsterUsed(run,monster){
  run.usedMonsterIds||=[];
  if(!run.usedMonsterIds.includes(monster.id))run.usedMonsterIds.push(monster.id);
}
export function selectF1Event(run){
  return choose(run,F1_EVENT_DEFINITIONS,`f1-event:${run.floor}:${run.depth}:${run.currentRoomNodeId||'unknown'}`);
}
