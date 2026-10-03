# PVE CONTENT-005D-B — 흡혈귀 30장

DESIGN-D CLOSEOUT와 사용자 확정 D02/D05/D06에 따른 runtime overlay. 원본 BETA/005R/DESIGN 및 stable IDs/golden은 보존한다.

## 구현

소유자별 독립 권속 표식/score→seat→playerId 대상 선택/숫자만 swap/표식 소비 및 추가 명령권1회 유지. 독립 numeric cooldown 또는 cycle skill lock을 추가하지 않는다. aug-301 old Dominance 소비→새 gain; aug-308 nonconsumed cap4 및 다음 distinct non-command valid 공격1회 charge. aug-307 owner collision validity만 보호. Pact bound target/스택·연속 유효/피해 및 다음 직접 피해 보호. Blood cap6/8,auto transfusion4/3,327우선 emergency,heal1,325/329 MAX merge,330 receipt1회 환급.

Public mark/Dominance/Pact/Blood, owner-only Reserve, server-only guards. Serial states reconnect 보존, once journals turn/cycle pruning, cleanup Combat 종료. 후보3/9/9/9,3 full builds,actual EXP progression. 한글 tooltip은 실행 규칙의 조건·수치·범위를 설명한다.

## 검증 상태

신규 테스트175개 준비. 원격 저장소 module과 준비한 overlay를 메모리에서 연결한 보조 검증175/175. Node GitHub CI/npm test/npm run check/smoke/stress가 최종 기준이며 아직 수락하지 않는다.

과거 전역 count 갱신은 PR25 사용자 승인 5973473233의 제한 범위를 유지한다. 구조/중복/slot/005C exact120/001~270 exact270 및 protected hash 검사는 유지한다.

VAMPIRE_RUNTIME_COMPLETE=false
READY_FOR_PVE_CONTENT_005D_C_GHOST=false

Draft 유지, merge/Ready/deploy/Supabase/DB/schema 변경0.
