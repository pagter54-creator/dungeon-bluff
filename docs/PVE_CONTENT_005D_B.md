# PVE CONTENT-005D-B — 흡혈귀 30장

DESIGN-D CLOSEOUT 및 사용자 확정 D02/D05/D06에 따른 실행 구현. BETA/005R/DESIGN 원본과 stable ID는 보존한다.

## 구현

소유자별 권속 표식, score→seat→playerId 대상 선택, 숫자 교환, 표식 소비/추가 명령권, 지배 및 Pact, owner collision 보호, 자동 수혈과 Blood, 다음 유효 공격 보너스 및 회복 영수증을 구현했다. 숫자 cooldown/cycle 사용 제한을 추가하지 않는다. Reserve는 소유자만, guards/receipts는 서버만 볼 수 있다. 전투 종료 정리와 재접속/중복 처리 방지를 포함한다.

## 승인된 과거 규칙 이관

executionRuleSource: PVE_CONTENT_005Q_DESIGN_D
supersedesHistoricalRule: [growthExpThrallTarget, manualTransfusion]

사용자 RESUME NIGHT RUN 결정에 따라 T03 수동 수혈 전제를 POST_DAMAGE_PRE_DOWN 자동 수혈로 바꾸었다. 24 fixtures와 부족 Blood/충분 Blood/풀 HP/쓰러짐/치명타/실제 피해 뒤 순서/retry/reconnect/비재귀 회복 검사를 유지한다. Guard/redirect/White Magic/Revenge/HP 및 DIRECT 규칙은 변경하지 않았다. 수혈 사건은 자동 발동임을 기록하고 회복 identity와 Blood 비용을 기록한다.

T04 smoke seed는 score 동점으로 기존 target과 동일하다. 기존 비교 정책이 읽던 runtime cycle flag를 봇 자체의 제한된 정책 journal로 옮겨 원래 선택 정책을 보존했다. runtime에는 이 정책 제한을 적용하지 않는다. T04 golden은 원본 그대로이며, 높은 score 우선순위는 신규 runtime 테스트로 검증한다. unrelated golden 변경은 0. 이관 fingerprint는 audit/runtime JSON에 기록한다.

## 검증

흡혈귀 신규 실제 Node 테스트182개는 이전 HEAD에서182/182 PASS. 이관 전 전체1767개는1762 PASS/5 FAIL. 이관 후 최종 GitHub npm test/check/smoke 및 지정 스트레스 검증은 진행 중이며, 아직 수락하지 않는다.

VAMPIRE_RUNTIME_COMPLETE=false
READY_FOR_PVE_CONTENT_005D_C_GHOST=false

Draft 유지. merge/Ready/deploy/Supabase/DB/schema 변경0.
