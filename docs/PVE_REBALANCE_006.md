# PVE REBALANCE 006 — Prophet fixed slot / F3 diagnostic audit

Built on REBALANCE005 BOTH candidate.

## 기준과 범위

- Source PR37: `ee31994a95969e7abce667108d14a393cfff20d8`.
- 조사 시작 시 main: `56f2f9098cec3a91efef3568896628f209d6a9e1`.
- Branch: `feat/pve-rebalance-006-f3-audit`; Draft PR only. main merge/deploy 없음.
- Runtime SHA256: `2dc6f9f98032d9dd1a7cbac10f70a37b729cb6f0291ec5c0b8cd42d3a2b30764`.
- PR37 BOTH Moon/public-pattern AI 및 최신 예언가/흡혈귀 유지. F3 수치/패턴/AI policy 조정 없음.
- Supabase 호출 0, production mutation 0, READY_FOR_PRODUCTION=false.

## 예언 전용 물리 슬롯

BEFORE: 숫자 0 검색 때문에 상점에서 구입한 다른 0 카드와 편린 대상이 혼동될 수 있었다.

AFTER: 첫 물리 카드에 PROPHECY_SLOT 식별자를 유지한다. PvE canonical base:1, PvP slot:0을 공유 helper로 판정하며 normal cycle/reconnect에서도 ID를 유지한다. 기본 카드 0/1/2/3/4, slot1 상태 BASE_ZERO → PAST_FRAGMENT(value N) → USED_ZERO. 편린 제출은 valid/collision에 관계없이 소비하고 기존 stun/aug162 의미를 유지한다.

상점에서는 모든 상태의 slot1을 교체 대상으로 비활성화한다. 서버는 malformed request에 PROPHET_PROPHECY_SLOT_LOCKED를 반환하고 예약 만료/Gold/카드 mutation 전에 거절한다. 다른 구매 0은 정상 카드다. aug169는 나머지 네 일반 슬롯의 사용 완료로 cycle을 리셋하며 기존 편린은 유지한다. 소비된 슬롯은 같은 ID의 기본 0으로 돌아온다.

전용 authoritative fixture 100회: 정상 교체 선택 100, 전용 슬롯 정상 선택 0, 악성 요청 거절 200, 편린 생성/제출 각100, aug169 편린 유지100, reconnect 검사300, 실패0. 이 수치는 randomized expedition에서 관측한 카운터가 아니다.

## 산출물 재사용 / 오류 복구 / provenance

원래 direct EXPEDITION_LIKE target 1300회는 room context / Gambler saved-zone 복원이 빠져 있었으므로 전부 제외했다. 실제 room entry처럼 node/depth 및 restoreCardCycle을 복원한 1300회 중 유효1292회를 재사용했다. 남은8개는 몬스터 이름의 null이 diagnostic combat ID에 들어가 scope guard에 걸린 경우였다. opaque deterministic hash ID로 교정 후 해당8개 seed만 재실행: 오류0.

최종 targeted2600 = 기존 유효 CONTROLLED1300 + 복원된 E1292 + ID 재실행8. full500 및 F3 sequence250은 실제 room API를 사용하므로 위 direct-target hotfix가 적용되지 않는 경로이며 재사용했다. 모든 dataset의 production runtime hash는 동일하다. 이전 파일을 최종 스크립트에서 새로 생성한 것이라고 소급 표기하지 않는다. 원본 파일 SHA256, 폐기/재사용/재실행 구분은 PVE_REBALANCE_006_PROVENANCE.json에 기록한다.

F3 compatible entry25개를 실제 최신-rule full500에서 수집했다. old-rule migration0, synthetic fallback0. 각 species E cohort 및 sequence250이 이25개를 재표집하므로 독립 표본이 아니며 결과를 일반화할 때 주의해야 한다. 실제 full500 F3 species exposure n<30은 LOW_SAMPLE_WARNING으로 표시한다.

## 테스트

Baseline2910/0fail → slot2916/0fail → 최종2919/0fail. JS/TS276개 구문 및 reference check PASS. 9개 새 고정 슬롯 테스트, 390 effect executable/후보 reachable 검사 실패0. 최종 harness ID repair 이후 추가 회귀 결과와 remote CI 상태는 Draft PR 및 Sheets summary의 closeout 기록을 따른다.

## F3 inventory / 개별 표적 결과

일반7종 HP145, elite3종 HP230, boss2종 HP340, cadence delay1 유지. 일반/elite는 각100 CONTROLLED +100 E, boss각150+150. 표적 예외0, turncap0.

| 몬스터 | C 클리어 | E 클리어 |
|---|---:|---:|
| 탐욕의 미믹 |96%|100%|
| 왕실 세금징수관 |100%|100%|
| 심연의 결투가 |79%|97%|
| 검은 성가대 |15%|58%|
| 기술먹이 사역마 |99%|100%|
| 심연의 기록관 |99%|100%|
| 왕실 감정관 |100%|100%|
| 처형 골렘 |78%|96%|
| 심연의 감사관 |97%|100%|
| 무효의 종사제 |98%|100%|
| 심연왕 |14.67%|40%|
| 가면의 여왕 |1.33%|5.33%|

Tier/cohort별 wipe, damage10, downs10, mean turns, clear의 개별 rank/median 및 패턴/기본 피해 분리는 MONSTERS/BOSS CSV와 Sheet에 기록한다. E 일반 wipe 순위 성가대42% > 결투가3% > 나머지0%; E elite 처형골렘4% > 나머지0%. Boss는 가면의여왕94.67% > 심연왕60% wipe.

## 패턴 진단

Adaptive Tax10/8/5/3, Choir3/3/2/1, Execution5/4/3/2를 기존 source대로 유지. Tax/Choir/Execution 명시 requirement에 대해서만 legal-hand oracle을 수행했다. 실패 turn의 deterministic1/20 sample, species당 execution cap40, 최대128 legal combination. 미표집/미완료/RNG 의존은 no-legal 분모에서 제외한다. 현재 submission window/forced cards 고정 조건의 witness만 AI misplay라고 부른다. 미래 turn의 완전 최적 플레이 증명은 아니다.

| 패턴 | C pass/fail | E pass/fail | C witness/no-legal | E witness/no-legal |
|---|---:|---:|---:|---:|
|Tax|301/1179|375/554|17/8|16/7|
|Choir|479/444|659/308|14/10|11/2|
|Execution|513/481|579/210|16/7|2/5|

다른 패턴은 실제 event/state 관측 및 피해 기여를 기록하며 정의되지 않은 예방 조건의 no-legal rate를 만들지 않는다. failure cause는 HP/Flame attrition, 긴 전투, tier spike의 복합 heuristic으로 인과 증명이 아니다.

## Funnel

| 단계 | Full500 | F3-only250 |
|---|---:|---:|
|F1 clear|153|해당 없음: F3 진입 snapshot|
|F2 clear / F3 enter|25|250|
|F3 첫 전투 clear|23|231|
|F3 첫3 전투 생존|17|182|
|F3 휴식 도달|16|162|
|F3 boss reach|16|162|
|RUN_CLEAR|8|109|

Full500 F3Enter5%, F3 조건부 boss reach64%, 조건부 clear32%; 전체 clear1.6%. F3-only boss reach64.8%, clear43.6%. REST는 기록된 실제 map/기존 선택 policy를 deterministic replay한 경로 도달치이고 combat gate는 실제 encounter 관측이다. F3-only에 남은 F1/F2 clear 필드는 snapshot의 이미 완료된 floor를 뜻하며 새로 진행한 F1/F2가 아니다.

PR37 BOTH 첫250 matched: prior/current clear4/4, 여섯 주요 결과지표250/250동일. CONTROL500은 존재하지 않아 비교값을 만들지 않았다.

## REBALANCE007 점검 제안 — 실제 조정 없음

1. 검은 성가대: E wipe42%, damage10=9.40, pattern7.30/base2.10. requirement/패턴 축을 먼저 점검.
2. 가면의 여왕: E wipe94.67%, damage10=6.83, pattern2.09/base4.74. 기본 공격 cadence 축을 먼저 점검.
3. 심연왕: E wipe60%, damage10=4.60, pattern0.16/base4.44. 기본 공격 cadence 축을 먼저 점검.

너무 쉬운 후보는 Tier/cohort median 대비 clear>=90% 및 damage10<=0.75배인 경우만 표시한다. 단순100% clear만으로 nerf를 권고하지 않는다.

## 재현

준비: `node scripts/pve-rebalance-006-prepare.mjs <candidate> <output>`.

Full: `PVE_EXPEDITION_COUNT=500 node <output>/simulate.mjs 0 0 full-only`.

F3 sequence: `PVE_F3_SNAPSHOTS=<full-results> PVE_EXPEDITION_COUNT=250 node <output>/simulate.mjs 0 0 f3-only`.

Target: `PVE_F3_SNAPSHOTS=<full-results> node <output>/simulate.mjs 0 0 f3-target`.

部分復旧: `PVE_COHORT_ONLY=EXPEDITION PVE_REPAIR_SEEDS=<JSON seed array>`로 지정 표본만 실행. build generation 순서는 유지된다. lifecycle fixture: `node scripts/pve-rebalance-006-slot-audit.mjs` (fixture output scope 별도).

## Google Sheets / machine-readable results

[REWORK006 보고서](https://docs.google.com/spreadsheets/d/1XfdZxEvaTOBqTqG1Kblm-HpyQMk-zbgWgkUVevNMoFA/edit#gid=910110).

기존53탭 보존, REWORK_006_* 8탭 추가. SUMMARY/MONSTERS/PATTERNS/FUNNEL/BOSS/FAILURES/RUNS/PROPHET_SLOT CSV 및 RESULTS/PROVENANCE JSON을 함께 제공한다. 모든 PART M flag는 RESULTS JSON 참조. F3_MONSTER_VALUES_CHANGED=false, READY_FOR_PRODUCTION=false.
