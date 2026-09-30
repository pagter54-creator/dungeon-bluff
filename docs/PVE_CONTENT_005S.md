# PVE CONTENT-005S — BETA v0.1 source import and contract audit

## Provenance and reconciliation

Canonical source: `눈치레이드_PVE_증강_390장_BETA_v0.1.xlsx`, worksheet `전체 증강`; SHA-256 `53f7b239f25778321b63c5fbdcdab2958114ab60869e81dec6274163bf05d48a`. The three JSON batches preserve all 390 source card rows, their original description, BETA value, limit, telemetry text, review metadata, and exact worksheet row. The workbook itself is a user attachment and is not committed as a binary.

Mapping is by the existing numeric `aug-001`–`aug-390` slot, then class, archetype, stage and option. All 390 map uniquely. Status: MATCHED 390, NAME_MISMATCH 0, STRUCTURE_MISMATCH 0, AMBIGUOUS_MATCH 0, NO_SPEC 0, NO_SLOT 0. This includes 162 missing runtime slots whose prior matrix used `UNKNOWN_CANONICAL_NAME`; the spreadsheet supplies their names. No persisted ID or Knight build name changes. The existing saved names `불굴의 기사` and `압살 기사` agree with the spreadsheet, while earlier short labels `불굴` and `압살` are aliases only.

The 005A baseline remains EXECUTABLE 19, DATA_ONLY 198, MISSING 173. The latter two groups now have source rows (198 `SPEC_INCOMPLETE` data-only, 173 `SPEC_INCOMPLETE` missing-runtime). None is executable or formally `SPEC_READY` because the source does not fix all required execution fields.

## Contract state and ambiguities

Each JSON row has all 24 required contract keys and a source pointer. Null means **unresolved**, not NONE or an implicit default. The original effect and BETA value are preserved separately; they are not a validated runtime tooltip. Every row is `SPEC_INCOMPLETE` because source prose alone does not establish the canonical engine trigger, structured condition/operation, once/reset/persistence scopes, room applicability, visibility, primitive mapping, and test assertions. A blanket conversion of prose to phases would invent behavior. 113 rows additionally have `AMB-AUG-aug-NNN-CONDITION` because they use vague phrases such as “조건 달성 시” or “일정 횟수”. These require a card-by-card design decision. For other unresolved fields, the per-card `unresolvedFields` list is the explicit blocker; use `AMB-AUG-<augmentId>-<field>` when filing a decision.

The 005F framework can be designed from the source and risk table, but 005B–D runtime implementation must wait for the affected card’s fields. `READY_FOR_PVE_CONTENT_005F = false` under the user’s strict success gate because unresolved trigger/condition/scope decisions could change primitives and regression behavior.

## Canonical vocabulary to settle

- Trigger candidates aligned with existing engine phases: COMBAT_START, CARD_VALIDATED, BEFORE_DAMAGE, BEFORE_PLAYER_DAMAGE, plus selection/room lifecycle hooks. The requested ON_ACQUIRE, TURN_START, PRE_SELECT, ON_SUBMIT, POST_REVEAL, PRE_COLLISION, POST_COLLISION, ON_VALID, ON_INVALID, PRE_DAMAGE, POST_DAMAGE, ON_KILL, ON_DOWN, ON_RECOVER, ON_CYCLE_RESET, COMBAT_END, ROOM_END, FLOOR_END need an explicit mapping to existing emitters before being committed per card. No new emitter is authorized by the spreadsheet.
- Once: NONE, ONCE_PER_TURN, ONCE_PER_CYCLE, ONCE_PER_COMBAT, ONCE_PER_ROOM, ONCE_PER_FLOOR, ONCE_PER_RUN. A raw phrase such as “턴당 1회” is retained in `limit`; a card with multiple effects may need multiple counters.
- Reset: TURN, CYCLE, COMBAT, ROOM, FLOOR, RUN. Persistence: COMBAT, ROOM, FLOOR, RUN. These are distinct and currently unresolved per source card.
- Visibility: PUBLIC, OWNER_PRIVATE, SERVER_ONLY. Published class resources may be public; exact Gambler hand/discard and unused-card state remain owner-only. Internal once counters stay server-only.

## Framework and class interaction contract

Existing number order from 005A: BASE_NUMBER → SELF_MODIFY → PRE_COLLISION_SWAP → PRE_COLLISION_STEAL → FINAL_NUMBER → COLLISION_GROUP → COLLISION_RESOLUTION → POST_COLLISION_EFFECTS → VALIDITY → DAMAGE. Keep it. Proposed damage composition to validate against actual engine: base card → class base modifier → flat augment → conditional augment → additive extra hit → multiplier (if specified) → enemy mitigation → actualDamage. No multiplier is implied by the spreadsheet. Preserve existing mitigation and actualDamage attribution until integration tests prove a safe mapping.

Healing: base HP 3. Berserker base collision heal caps at HP 2 per the user’s fixed T02 decision; `aug-131` explicitly permits max HP. `aug-321` requires Blood 4 for HP 1, Blood cap 6, one transfusion per turn. No generic heal may bypass DOWNED/Flame behavior.

Card recovery: preserve the same `cardInstanceId` through SPENT → REMAINING; never auto-submit. Carry rootActionId, recoveryChainId, parentEventId and chainDepth with a finite recursion ceiling. Prevent repeated recovery from firing its own source again in the same chain. ON_ACQUIRE needs a persisted idempotency key for each acquired augment and player, so reconnect, reload, replay and result reads cannot retrigger a grant.

Gambler `aug-211`–`aug-240` needs a deck-zone adapter for draw pile, hand, discard, vanished cards, 6/7 unlock, draw count and reshuffle; it must not use standard spent-card recovery as DRAW_CARD. Gunslinger `aug-241`–`aug-270` must distinguish magazine expansion, Full Burst success/failure, reset, extra use, self damage and Heat 0–3 cooldown. Twins `aug-361`–`aug-390` must separate parity permission, parity flip/reset, recharge and damage bonus. Ghost Swordsman `aug-331`–`aug-360` must separate run-persistent Devour from combat-scoped transformation; `aug-351` uses Devour 6 and transformed pool 2/4/5/6. Vampire `aug-301`–`aug-330` needs Thrall, Blood and blood-command ownership/caps separate. Imp `aug-181`–`aug-210` must retain PRE_COLLISION_STEAL ordering, actual stolen amount, and `aug-201` delayed Mischief damage. Poison `aug-071` caps at 3; application, two-ally-valid-attack tick, expiry and source attribution need tests. All delayed cards need scheduledAt, resolveAt, cancelCondition, combatEndBehavior, BossDeathBehavior and reconnectBehavior before execution.

Event, Reward, Shop and Rest applicability are per-card unresolved in the JSON. Number changes can affect Event/Reward only when the existing shared resolution path explicitly emits the relevant hook. Monster-only damage cannot fire in Event. Do not infer Shop or Rest effects from economy-themed text. UI should draw name, stage, archetype, effect and limits from the canonical row after its structured semantics are approved; do not silently display the original flavor paragraph as a numeric tooltip.

## Primitive audit and 005F priority

**SUPPORTED in existing executable examples:** resource set/add/max/capture; flat damage and incoming direct damage adjustments; existing class-specific number processing. **PARTIAL:** heal/self damage/down flow, number swap/steal generic metadata, recovery, draw/discard/cycle, status lifetime, economy grant and once counters. **MISSING as safe generic augment primitives:** acquisition idempotency, base-rule override schema, card-zone mutation, delayed trigger scheduler, ordered extra hit/multiplier, relic grant arbitration, Shop/Rest hooks. These are capability categories, not a count of 390 assigned primitives: per-card primitive mapping remains unresolved.

005F priority: (1) acquisition idempotency; (2) status, once and reset scopes; (3) recovery chain guard; (4) draw/deck zones; (5) damage ordering; (6) self damage and heal caps; (7) delayed effects; (8) explicit base overrides; (9) economy/relic grants; (10) class adapters. Preserve the existing T06 invariant and privacy projection.

## Existing 19 comparison

Source names/ID/class/stage match all 19. Explicit **MISMATCH_VALUE**: `aug-061` BETA requires sneaky stack +1 up to 2 and consumption, while current generic effect sets the stack to 1 after a valid solo-lowest card. `aug-301` BETA requires Dominance +1 up to 2; current effect clears and re-adds 1 on each valid command, preventing 2. Mark both for 005F/batch correction; no runtime is changed here. The remaining 17 match the imported top-level numeric configuration or require handler-level verification; that is **not** proof of complete trigger/limit parity. No speculative rewrite is applied.

## High-risk manual review queue (27)

| augmentId | name | class | risk | betaValue | trigger | cap/limit | possibleExploit | requiredGuard | requiredTest |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| aug-021 | 기적의 탐험가 | adventurer | party EXP grant | 4명이 서로 다른 숫자로 모두 유효 성공하면 '기적의 발견': 전원 EXP +1. | unresolved | 전투당 1회. | duplicate reward | idempotent reward key and explicit scope | acquisition/retry/reconnect + limit boundary |
| aug-028 | 모두의 모험담 | adventurer | stacked EXP economy | 기적의 발견 시 전원 EXP +2 추가; 한 층 3회 달성 시 전원 EXP +5 추가. | unresolved | 층당 추가 지급 1회. | duplicate reward | idempotent reward key and explicit scope | acquisition/retry/reconnect + limit boundary |
| aug-030 | 전설의 발견 | adventurer | extra relic idempotency | 한 층에서 기적의 발견 3회 이상 달성 후 보스를 클리어하면 파티용 추가 유물 1개 획득 기회 생성. | unresolved | 런 전체 1회. | duplicate reward | idempotent reward key and explicit scope | acquisition/retry/reconnect + limit boundary |
| aug-041 | 수호벽 | warrior | collision override and damage redirect | 강인함 1 소모. 기사 카드는 무효·소비되고 같은 숫자 아군 1명은 중복을 무시해 유효 처리. 그 아군이 받을 다음 직접 피해 1회를 기사에게 전가 가능. | unresolved | 호위는 턴당 1명; 전가 피해는 원래 피해량 그대로. | phase ordering / repeated activation | ordered phase and one-shot marker | acquisition/retry/reconnect + limit boundary |
| aug-061 | 비열한 일격 | rogue | stack consumption mismatch | 단독 최저 유효 성공 시 '비열함' +1(최대 2). 다음 단독 최저 공격은 비열함 1당 추가 피해 +1 후 비열함 전부 소모. | unresolved | 중복/단독 최저 실패 시 비열함 0. | unbounded stack or refund | explicit cap and reset token | acquisition/retry/reconnect + limit boundary |
| aug-071 | 독 묻은 칼날 | rogue | poison tick and attribution | 단독 최저 유효 성공 시 맹독 1(최대 3). 맹독이 있는 적은 아군 유효 공격 2회마다 맹독 1을 소모하고 추가 피해 2. | unresolved | 도적 본인의 개인 비열한 일격 피해 강화는 제거. | unbounded stack or refund | explicit cap and reset token | acquisition/retry/reconnect + limit boundary |
| aug-098 | 무한 마력기관 | mage | mana refund loop | 증폭 공격 유효 성공 시 소비 마나의 절반(내림) 환급. | unresolved | 턴당 최대 2마나 환급. | unbounded stack or refund | explicit cap and reset token | acquisition/retry/reconnect + limit boundary |
| aug-105 | 연쇄 치유 | mage | multi-target heal | 백마법으로 동시에 2명 이상과 충돌했다면 HP가 낮은 최대 2명까지 각각 HP1 회복. | unresolved | 턴당 1회. | healing loop | HP cap and per-turn/cycle counter | acquisition/retry/reconnect + limit boundary |
| aug-151 | 완전한 계시 | prophet | revelation refund loop | 계시로 복구한 카드를 유효하게 사용하면 전투당 1회 계시 1을 즉시 다시 획득. | unresolved | 즉시 재획득은 전투당 1회. | phase ordering / repeated activation | ordered phase and one-shot marker | acquisition/retry/reconnect + limit boundary |
| aug-161 | 운명 조작자 | prophet | ally card recovery | 계시 사용 시 아군 1명을 지정해 그 아군의 사용 카드 중 무작위 1장을 복구할 수 있음. | unresolved | 계시 1회당 카드 1장; 특수/임시 카드는 복구 불가. | card identity / repeated activation | physical card ID, zone invariant, root action chain ceiling | acquisition/retry/reconnect + limit boundary |
| aug-171 | 불길한 예언 | prophet | delayed prediction | 계시 사용 시 다음 턴 예언 1개 선언. 적중 시 '예지' 1(최대 2); 예지 1당 예언가의 다음 유효 공격 추가 피해 +1 후 전부 소모. | unresolved | 예언 종류: 중복 발생/무중복/지정 숫자 유효. | phase ordering / repeated activation | ordered phase and one-shot marker | acquisition/retry/reconnect + limit boundary |
| aug-201 | 장난의 연쇄 | imp | delayed ally buff and self damage | 슬쩍당한 아군에게 장난 부여. 다음 턴 그 아군의 첫 유효 공격 추가 피해 +2. 장난이 남은 채 다시 슬쩍당하면 버프 소멸 + 피해 1. | unresolved | 장난은 1턴 지속. | phase ordering / repeated activation | ordered phase and one-shot marker | acquisition/retry/reconnect + limit boundary |
| aug-211 | 운명의 승부사 | gambler | Gambler charge and deck zones | 6 또는 7 유효 성공 시 행운 1 획득. 다음 일반 카드 유효 공격에 추가 피해 +1 또는 다음 특수 카드 충전 진행 +1 중 선택 후 소모. | unresolved | 행운 최대 1. | card identity / repeated activation | physical card ID, zone invariant, root action chain ceiling | acquisition/retry/reconnect + limit boundary |
| aug-221 | 카드 카운터 | gambler | shuffle-cycle count | 이번 셔플 주기에서 아직 사용하지 않은 1~5 숫자를 유효하게 쓰면 카운트 +1(최대 3). 3 도달 시 다음 유효 공격 추가 피해 +2 후 0. | unresolved | 본인에게 덱/버린 덱 상세 UI 공개. | card identity / repeated activation | physical card ID, zone invariant, root action chain ceiling | acquisition/retry/reconnect + limit boundary |
| aug-231 | 올인 | gambler | two-card all-in identity | 현재 드로우 2장 중 1장을 판정 숫자로 지정. 유효하면 피해는 두 카드 숫자 합으로 처리하고 두 장 모두 소비. | unresolved | 다음 턴 드로우 1장. 중복이면 피해 0, 두 장 모두 소비. | card identity / repeated activation | physical card ID, zone invariant, root action chain ceiling | acquisition/retry/reconnect + limit boundary |
| aug-241 | 전탄 난사 | gunner | Full Burst deck expansion | 사이클 카드풀을 1/2/2/3의 4장으로 변경. 전탄발사 성공 시 기존처럼 남은 카드 전부 추가 사용. | unresolved | 전탄발사 기본 재사용 규칙은 유지. | card identity / repeated activation | physical card ID, zone invariant, root action chain ceiling | acquisition/retry/reconnect + limit boundary |
| aug-251 | 정밀 사수 | gunner | Full Burst replacement | 전탄발사를 정밀 조준으로 교체. 사이클 내 이미 소비한 카드 수가 0/1/2일 때 현재 유효 공격 추가 피해 +0/+1/+3. | unresolved | 남은 카드는 추가 소비하지 않음. | card identity / repeated activation | physical card ID, zone invariant, root action chain ceiling | acquisition/retry/reconnect + limit boundary |
| aug-261 | 과열 기관 | gunner | Heat and Full Burst cooldown | 전탄발사를 매 사이클 1회 사용 가능. 사용 시 과열 +1, 중복 실패 시 추가 +1. 전탄발사 미사용 턴 종료 시 과열 -1. 과열 3이면 다음 턴 전탄발사 사용 불가 후 과열 1로 감소. | unresolved | 과열 범위 0~3. | card identity / repeated activation | physical card ID, zone invariant, root action chain ceiling | acquisition/retry/reconnect + limit boundary |
| aug-291 | 일격필살 | martial_artist | combo preservation and burst | 중복되어도 연격 스택 유지. 필살 사용 후 유효 성공하면 연격 전부 소비, 소비한 연격 1당 추가 피해 +2. | unresolved | 필살 실패 시 연격 미소모; 사이클당 1회. | unbounded stack or refund | explicit cap and reset token | acquisition/retry/reconnect + limit boundary |
| aug-301 | 완전한 권속 | vampire | Dominance stacking mismatch | 피의 명령 교환 후 흡혈귀 공격이 유효하면 지배 +1(최대 2). 다음 피의 명령으로 교환한 카드가 유효할 때 지배 1당 추가 피해 +1 후 전부 소모. | unresolved | 피의 명령은 사이클당 1회. | unbounded stack or refund | explicit cap and reset token | acquisition/retry/reconnect + limit boundary |
| aug-321 | 수혈 | vampire | Blood and healing cap | 유효 공격 성공 시 혈액 +1. 혈액 4 소비 시 최저 HP 생존 아군 HP 1 회복. 혈액 최대 6. | unresolved | 전투 종료 시 혈액 0; 턴당 수혈 1회. | healing loop | HP cap and per-turn/cycle counter | acquisition/retry/reconnect + limit boundary |
| aug-331 | 포식 귀참 | demon_swordsman | Devour/Slash feedback | 귀참 유효 성공 시 포식 +1 추가 획득. | unresolved | 귀참 1회당 추가 포식은 1. | unbounded stack or refund | explicit cap and reset token | acquisition/retry/reconnect + limit boundary |
| aug-341 | 굶주린 마검 | demon_swordsman | Devour threshold override | 귀참 레벨업 요구 포식 8→6. 3턴 연속 포식을 1도 얻지 못하면 귀참 레벨 -1(최소 0). | unresolved | 레벨 하락 판정은 턴 종료 시. | unbounded stack or refund | explicit cap and reset token | acquisition/retry/reconnect + limit boundary |
| aug-351 | 해방된 귀검 | demon_swordsman | transformation deck and persistence | 포식은 전투마다 0 시작. 포식 6 도달 시 귀화 가능. 귀화 카드풀 2/4/5/6으로 교체되며 4장 모두 사용하면 원래 카드풀로 복귀. | unresolved | 귀화 종료 시 남은 포식 0. | card identity / repeated activation | physical card ID, zone invariant, root action chain ceiling | acquisition/retry/reconnect + limit boundary |
| aug-371 | 태양과 달 | twins | parity/eclipse state | 기본 +2 제거. 태양2/달2 시작. 홀수 유효 시 태양+1, 짝수 유효 시 달+1(반대쪽 -1). 4/0 일식: 다음 특수 턴 유효 시 최저 HP 아군 HP1 회복. 0/4 월식: 다음 특수 턴 유효 시 추가 피해 +4. 이후 2/2. | unresolved | 특수 상태는 1턴 후 성공 여부와 무관하게 종료. | phase ordering / repeated activation | ordered phase and one-shot marker | acquisition/retry/reconnect + limit boundary |
| aug-381 | 공중 곡예 | twins | Acrobatics recharge | 곡예 재충전 = 유효 공격 3회. 곡예 직후 첫 유효 공격 추가 피해 +2. | unresolved | 곡예 사용 후 재충전 카운트 0. | card identity / repeated activation | physical card ID, zone invariant, root action chain ceiling | acquisition/retry/reconnect + limit boundary |
| aug-390 | 하늘을 걷는 쌍둥이 | twins | card recovery and Acrobatics recharge | 곡예 후 첫 3회의 공격을 모두 유효 성공하면 사용 카드 1장 복구, 곡예 재충전 카운트 +1. | unresolved | 곡예 1회당 1번. | card identity / repeated activation | physical card ID, zone invariant, root action chain ceiling | acquisition/retry/reconnect + limit boundary |

These are review targets, not balance changes. Trigger cells remain unresolved until engine phase and source condition are jointly reviewed.

## Balance telemetry and candidate forecast

The `BETA 기준` worksheet supplies these **BALANCE_WARNING** thresholds, never hard test failures: ordinary F1 combat frequently ≤4 or ≥9 turns; F3 party DPT routinely ≥28; one augment >20% of total damage; non-healer ordinary combat heal ≥2 often; repeated ≥2 recovered cards per cycle; EXP 750 reached before F2 often; augment net Gold >3G/floor often; defense builds with near-zero down/Flame; card choice >65% or <15%; build win rate >12 percentage points above class peer. Track combat turns, actual party DPT, healing, recovery, EXP 750 timing, net Gold, Flame/down, choice rates and wins. The per-card source telemetry text remains in every JSON row; field-level instrument mapping awaits event schema.

Structure forecast: 13 class stage-1 pools × 3 archetype starters, plus 39 archetypes × 3 later stages = **130 conceptual candidate pools**, exactly 3 cards per pool when all 390 become executable. Current executable shortfall from 005A is unchanged.

Readiness by batch: 005B 150 source rows / 0 complete structured contracts; 005C 120 / 0; 005D 120 / 0. All are AMBIGUOUS_SPEC under the strict “all execution questions answered” test, though the source import and ID mapping are complete. 005F should resolve common semantics before batch implementation.

## Verification and release boundary

`tests/pve-content-005s.test.mjs` validates stable IDs, source fields, prior 19/198/173 classification, 130 conceptual pools and selected fixed BETA values. Existing runtime and goldens are untouched. CI must run `npm test`, `npm run check`, and `npm run pve:stress:smoke` on this branch. No production deploy, runtime expansion or balance tuning is in this change.
