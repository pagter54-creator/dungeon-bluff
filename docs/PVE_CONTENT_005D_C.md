# PVE CONTENT-005D-C — 귀검사 30장

DESIGN-D 및 사용자 확정 D03/D07을 구현한다. 선행 B 최종 HEAD `62be0b795a325592f258ce68268859d80515262c`의 Project Checks #967 completed/success 확인 후 시작했다.

## 구현

aug-331~360의 포식 획득, 초과분 유지와 독립 귀참 레벨, 허기/광기/기간 피해, 수동 귀화와 새 실물 카드풀, 종료 처리, 소유자별 상태와 재접속 복원을 구현했다. 귀화 중 예언가 복구는 현재 풀의 동일 ID에 한정한다. 귀화는 확정 제출 전 직접 활성화하며 전투 중 자동 발동하지 않는다. 일반 사이클을 폐기하고 종료 뒤 새 일반 사이클을 시작한다. 전투 종료에 임시 카드와 귀화 연료를 정리한다. 한국어 툴팁 30장을 제공한다.

## 승인된 historical migration

R01/R03 source precedence로 과거의 누적 포식 레벨 재계산 및 자동 변신 전제를 수정했다. 원본 T02/T06 golden 파일은 그대로 유지한다. 현대 동작 fingerprint와 귀검사 부분에 한정한 역사 복원 비교를 별도 `005d-golden`에 기록한다. 다른 직업의 피해·회복·카드·순서는 원본 비교와 일치한다. 세부 authority와 superseded rules는 audit/runtime JSON에 기록한다.

## 검증 상태

보조 검증 174 PASS/0 FAIL: 카드별 positive/negative/room/candidate/acquisition 각30, 세 빌드 실제 전투 및 EXP 단계, 복구·서로 다른 소유자·재접속·기간·물리 카드·privacy 포함. GitHub Project Checks #970 / run37209967863 completed/success. 검증 HEAD `a7ccb941dba39de1be243b735bbae4448e1af2e6`. 전체1945/1945 PASS,0 FAIL/skip. 프로젝트 검사228 files PASS. smoke80 및 T00/T02/T03/T04/T05/T06/T09 각100시드 hard failure0/failedSeeds0. 상세 warning 및 귀화 피해 통계는 audit JSON에 기록한다.

GHOST_RUNTIME_COMPLETE=true
READY_FOR_PVE_CONTENT_005D_D_TWINS=true

Draft 유지. 최종 문서 HEAD의 Project Checks 완료/성공 후 다음 단계 시작.
