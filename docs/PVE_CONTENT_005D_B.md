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

## DESIGN_BLOCKER — 현행 계약과 과거 golden의 규칙 차이

B 신규175개 Node 테스트는 PASS했으나 전체1760개 중1753 PASS/7 FAIL이었다. UI 이름/기본config 누락2건은 runtime/metadata에서 보완했다. 후속 UI 이름 삽입 comma 오류도 수정했다. 테스트 기대값이나 golden을 수정하지 않았다.

남은 의미 충돌: DESIGN-D의 score 기준 권속 선택/자동 수혈321과 T04의 growthExp 기준 표식·T03의 SELECTION_OPEN 수동 수혈은 동일 runtime에서 그대로 동시에 일치할 수 없다. 원본 golden 불변 및 전체 성공 요구를 지키려면 과거 규칙 버전의 검증과 현행 규칙 검증을 구분할지, 실행 계약을 재확정할지 사용자 결정이 필요하다. 기존 승인은3개 과거count/hash 검사만 대상으로 하므로 행동/golden 검사 변경을 포함하지 않는다.

방별범위/숫자교환/한국어이름·툴팁을 포함한 신규182개 보조 module 검증은 PASS이며 실제 Node 최종 HEAD CI를 다시 실행한다. 이 blocker 해결과 최종 전체CI SUCCESS 전까지 B 수락 및 C/D/FINAL 진입을 하지 않는다.
