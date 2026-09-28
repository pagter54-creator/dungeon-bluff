// Stable combat inputs for structural stress scenarios. These use the production
// resolver and intentionally retain the pre-CONTENT-001B encounter cadence.
const normal={
  id:'f1_armored_boar',name:'철갑 멧돼지',tier:'NORMAL',baseHp:75,usePattern:true,
  pattern:[
    {type:'DEFEND',telegraphText:'철갑을 세워 다음 공격을 버틴다',payload:{amount:1}},
    {type:'CHARGE',telegraphText:'땅을 긁으며 돌진을 준비한다',payload:{}},
    {type:'DIRECT_DAMAGE',telegraphText:'한 명을 향해 돌진한다',payload:{target:'RANDOM_LIVING',amount:1}}
  ]
};
const elite={
  id:'f1_echo_bat',name:'메아리 박쥐',tier:'ELITE',baseHp:120,usePattern:true,
  pattern:[
    {type:'CHARGE',telegraphText:'동굴을 울리는 초음파를 모은다',payload:{}},
    {type:'DIRECT_DAMAGE',telegraphText:'메아리를 따라 한 명에게 급강하한다',payload:{target:'RANDOM_LIVING',amount:1}},
    {type:'CHARGE',telegraphText:'천장으로 물러난다',payload:{}},
    {type:'CHARGE',telegraphText:'동굴 전체가 울리기 시작한다',payload:{}},
    {type:'AOE_DAMAGE',telegraphText:'메아리 충격파가 파티 전체를 덮친다',payload:{amount:1}},
    {type:'CHARGE',telegraphText:'다음 메아리를 준비한다',payload:{}}
  ]
};
const boss={
  id:'f1_fallen_lord',name:'몰락한 성주',tier:'BOSS',baseHp:180,usePattern:true,
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
    {type:'CHARGE',telegraphText:'다음 검격을 준비한다',payload:{}}
  ]
};
export const STRESS_REFERENCE_MONSTERS=Object.freeze({
  f1_armored_boar:Object.freeze(normal),
  f1_echo_bat:Object.freeze(elite),
  f1_fallen_lord:Object.freeze(boss)
});
