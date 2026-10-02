# PVE CONTENT-005B-C — Rogue 30/30 Runtime Completion

PR #17 remains **draft**. This report covers aug-061~090. The last fully verified code head before final documentation was `eec232d25136d66d625ffa245ff10cd36e8600fd`, where Project Checks #612 passed 769/769 tests plus check/preflight/stress and all 100-seed stages. A final documentation-head Project Checks SUCCESS is still required before the completion declaration is reported externally.

1. **변경 파일** — `rogue-contracts.js`, `rogue-runtime.js`, augment registry/dispatcher/candidate validation, combat pre-mitigation integration, Rogue base-damage replacement for Poison build, PVE UI catalog, Rogue tests, global registry regression expectation, and 005B-C runtime/audit/docs.
2. **Rogue target count** — 30.
3. **registered count** — 30.
4. **EXECUTABLE count** — 30.
5. **DATA_ONLY count** — 0.
6. **MISSING count** — 0.
7. **UNSUPPORTED count** — 0.
8. **전체 005B executable count** — **95/150**. Previous 66/150 already included aug-061, so this batch adds 29 unique executable IDs.
9. **aug-061~090 registry audit** — all 30 IDs resolve to an executable Rogue handler; candidate generation hard-fails if a Rogue candidate has no handler.
10. **candidate pool coverage** — 30/30.
11. **archetype coverage** — 비열한 일격 10 / 독 묻은 칼날 10 / 그림자 도약 10.
12. **Stage progression** — each archetype is 1 / 3 / 3 / 3 across Stage 1~4; Stage 1 locks the build line and later offers remain in that line.
13. **aug-061~070 비열한 일격 요약** — strict solo-lowest FINAL_NUMBER success drives Sneaky/streak state, next-turn windows, damage, protection and same-ID recovery. Failure/reset scopes are serialized rather than inferred from UI state.
14. **aug-071~080 독 묻은 칼날 요약** — Poison is source/owner/target attributed, capped at 3, and uses deterministic application/explosion/defense/recovery state. aug-071 replaces the Rogue personal solo-lowest fixed damage bonus with the Poison line instead of stacking both.
15. **aug-081~090 그림자 도약 요약** — all low/high/difference/direction comparisons use FINAL_NUMBER, with separate previous-number, jump-direction, leap-chain and failure-protection state.
16. **aug-061** — the existing T00 `aug-061-sneaky-success/reset/damage` generic effects remain for reference telemetry. ROGUE_V02 recognizes their resolved fields and does not double gain or double consume. Direct resolver tests use a compatible fallback path.
17. **aug-063** — only an immediately previous valid turn with a higher FINAL_NUMBER followed by a current solo-lowest valid lower FINAL_NUMBER grants +1.
18. **aug-066** — the window is exactly the next turn, not the next eventual valid attack; a higher FINAL_NUMBER valid success in that turn grants +2.
19. **aug-068** — Sneaky 2 is checked before base Sneaky consumption; qualifying solo-lowest damage receives +4.
20. **aug-070** — solo-lowest streak reaches its +4 reward from the third success; the first failure per combat preserves the record once, later failure resets it.
21. **aug-073** — FINAL_NUMBER 1/3 solo-lowest that actually applies Poison queues recovery of that exact physical card; TURN_END moves the same cardInstanceId SPENT → REMAINING once/cycle through the recovery primitive.
22. **aug-080** — Poison application queues deterministic recovery of the lowest eligible BASE 1~3 spent card, with most-recent SPENT as the tie-break; an explosion reaching zero retains Poison 1 once/turn.
23. **aug-082** — prior valid LOW 1~2 → current valid HIGH 4~5 with jump distance >=3 grants +1; BASE_NUMBER is never used for the comparison.
24. **aug-086** — the first leap-chain break per cycle preserves the generic leap chain. It is deliberately independent of aug-085's Stage-3 stack because those cards are alternative choices.
25. **aug-088** — immediately consecutive successful jumps must alternate direction; repeated same direction receives no +3.
26. **aug-090** — a successful jump queues the physical departure card for same-ID recovery once/cycle.
27. **single-lowest runtime** — canonical collision resolution already computes `soloLowest` after collision from VALID cards using strict single minimum of FINAL_NUMBER. Ties and collision-invalid cards never qualify.
28. **sneaky/streak runtime** — Sneaky, solo-lowest streak, critical stacks and next-turn windows are separated in serialized Rogue state; the aug-061 legacy generic resource remains interoperable.
29. **Poison runtime** — per-source Poison state stores owner/source/target/stacks/cap and never exceeds 3. Same-action application is resolved once through the Rogue dispatch path.
30. **Poison explosion** — ally valid-hit progress triggers the configured explosion, consumes stacks, applies a separate follow-up damage packet, then applies aug-080 residual Poison if applicable. aug-075/078 defense effects enter the pre-mitigation armor path.
31. **card recovery** — aug-064/069/073/080/090 use `recoverPhysicalCard`; no new card object is created, selected/submitted/remaining illegal zones stay rejected, and root/depth T06 guards remain active.
32. **Shadow Leap history** — previous FINAL_NUMBER, previous turn/card, direction, leap chain and aug-085 stack are independent keys so one mechanic cannot overwrite another.
33. **Event applicability** — Rogue augment runtime is Combat-only. The canonical Rogue base Event passive remains unchanged: VALID-only strict solo-lowest grants score +5 and Gold +2, tie false.
34. **Reward applicability** — Combat-only Rogue Poison/damage/leap runtime does not affect Reward ranking.
35. **room matrix** — aug-061~090: Combat 30/30; Event 0; Reward 0; Shop 0; Rest 0. Base Event passive is a separate character rule, not an augment-room exception.
36. **reconnect** — serialized tests preserve Sneaky, solo-lowest/leap history, Poison stacks, failure protection and physical-card zones. Candidate acquisition is also cloned/reconnected.
37. **determinism** — recovery selection uses explicit ordering or seeded choice where applicable; Poison source iteration uses seat order; same seed/actions preserve outcomes.
38. **privacy** — server-only Rogue history and Poison counters are not projected as peer current-cycle remaining/used cards; private card zones remain under existing projection rules.
39. **tooltip parity** — UI catalog contains executable descriptions for all aug-061~090 aligned to the current contracts; no placeholder “조건 달성 시” text is used for the Rogue batch.
40. **telemetry** — source augment records include augmentId/triggerCount/successCount and relevant Sneaky, solo-lowest, bonus damage, Poison, explosion, recovery and leap metrics. Existing aug-061 T00 effect IDs remain stable.
41. **positive tests count** — 30 named per-card positive cases.
42. **negative tests count** — 3 dedicated Rogue negative/scope cases, containing tie/invalid/cap/wrong-recovery, Event/Reward isolation and second-failure aug-086 assertions.
43. **poison tests count** — 10 named per-card positive cases for aug-071~080 plus cap/room/isolation assertions.
44. **recovery tests count** — 5 named positive recovery cards (064/069/073/080/090) plus negative recovery legality coverage and existing T06 framework/stress regressions.
45. **high-risk tests count** — all 11 mandatory high-risk IDs have named positive cases; aug-086 also has a named second-failure regression.
46. **candidate acquisition E2E** — Stage-1 three-card offer → choose → ownership/acquisition marker → reconnect PASS in the Rogue suite.
47. **full archetype builds** — three controlled Stage 1→4 build-line tests for 비열한 일격 / 독 묻은 칼날 / 그림자 도약.
48. **mixed party** — named Rogue + Adventurer + Knight + Mage test verifies FINAL_NUMBER Rogue handling without contaminating Knight Toughness, Mage Mana or Adventurer growth state.
49. **Adventurer regression** — Adventurer remains 30/30; global 005B registry expectation was advanced only from 66 to the actual 95.
50. **Knight regression** — Knight remains 30/30; T00/T04/T03 and the full suite preserve existing Toughness/Guard/Crush behavior.
51. **npm test** — last fully verified code head PASS, 769/769. The final mixed-party test raises the expected final documentation-head total to 770; latest Project Checks must confirm it.
52. **npm run check** — PASS on verified code head.
53. **npm run pve:stress:smoke** — PASS on verified code head; existing fixtures/goldens were not changed.
54. **Project Checks** — code head #612 SUCCESS: npm test/check, beta preflight, stress smoke, T06/T02/T00/T05/T09/T04/T03 100-seed stages and artifact uploads succeeded. Final documentation-head SUCCESS remains the publication gate.
55. **BALANCE_WARNING_005B_C** — none introduced. Existing global stress balance warnings remain diagnostic; no Rogue value was changed merely to silence them.
56. **runtime blockers** — none found in Rogue scope.
57. **ROGUE_RUNTIME_COMPLETE** — **true**, conditional on final documentation-head Project Checks SUCCESS.
58. **READY_FOR_PVE_CONTENT_005B_D_MAGE** — **true**, conditional on the same final gate.

## Invariants preserved

- BETA v0.1 source rows unchanged.
- Stable augment IDs unchanged.
- Stress fixtures/goldens unchanged.
- Adventurer 30/30 and Knight 30/30 preserved.
- No new Mage/Berserker runtime implementation was added.
- Supabase production schema/functions were not mutated or deployed by this batch.
