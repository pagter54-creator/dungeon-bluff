# PVE CONTENT-005B-B — Knight 30/30 Runtime Completion

PR #17 remains **draft**. This completion report covers aug-031~060 and records the verified final result from Project Checks #596 (code head `979da0d2436e3fdfc38fa8d40178c1509472dfe1`).

1. **변경 파일** — Knight contract/runtime, augment registry/dispatch, combat/character/monster/event/reward hooks, UI catalog, Knight tests, Adventurer registry regression expectation, and 005B-B docs/audit.
2. **Knight target count** — 30.
3. **registered count** — 30.
4. **EXECUTABLE count** — 30.
5. **DATA_ONLY count** — 0.
6. **MISSING count** — 0.
7. **UNSUPPORTED count** — 0.
8. **전체 005B executable count** — **66/150**. The prior 39/150 already included aug-031, aug-041, and aug-051, so this batch adds 27 unique executable IDs rather than 30.
9. **aug-031~060 registry audit** — all 30 IDs resolve to executable handlers; missing-handler candidate validation hard-fails.
10. **candidate pool coverage** — 30/30.
11. **archetype coverage** — 불굴의 기사 10 / 수호벽 10 / 압살 기사 10.
12. **Stage progression** — each archetype is 1 / 3 / 3 / 3 across Stage 1~4.
13. **aug-031~040 불굴 구현 요약** — cap/start/refund, one-shot mitigation, HP1 first-transition, free-use, and next-cycle recharge use serialized resource/lifecycle state.
14. **aug-041~050 수호벽 구현 요약** — deterministic Guardian rescue, one active protection, exact-card recovery, follow-up redirect, lethal redirect prevention, and multi-rescue handling.
15. **aug-051~060 압살 구현 요약** — actual removed-card count, FINAL_NUMBER checks, pre-mitigation penetration, refund/burst/momentum/breakthrough/Advance are wired to collision results.
16. **aug-037** — only the first actual HP >=2 → exactly 1 transition per combat grants Toughness +1; starting at HP1 does not trigger.
17. **aug-038** — first legal Toughness activation per cycle is free; illegal/cancelled requests do not consume it; Combat/Event/Reward supported.
18. **aug-041** — Guardian Wall operates in Combat/Event/Reward and uses deterministic lobby-seat target ordering.
19. **aug-044** — successful guard reserves +1 Toughness for the next cycle, once/cycle, including allowed non-combat rooms.
20. **aug-045** — same BASE physical `cardInstanceId` is recovered SPENT → REMAINING via the recovery primitive, once/cycle.
21. **aug-049** — after base Guardian redirect is consumed, exactly one further direct hit to the marked ally redirects to the same Knight; no same-resolve double redirect.
22. **aug-052** — true crush ignores exactly 1 enemy defense before mitigation; legacy self incoming-damage behavior is not used.
23. **aug-055** — actual removed count >=2 grants +3 to that crush attack only.
24. **aug-057** — ending a turn at effective max Toughness without using Toughness arms breakthrough; next crush consumes it for refund 1 + damage 1.
25. **aug-060** — crush gains Advance up to 4; valid attacks gain damage per stack; a non-crush valid attack uses the current stack then decays by 1 after damage.
26. **Toughness runtime** — base deck 2/3/4/5/5, base max 2, cycle recharge and collision override remain intact; augments extend the resolver rather than replacing the base rule.
27. **Guard runtime** — Guardian state is owner/target/source attributed; target selection is deterministic; hidden target injection for aug-046 is ignored because no target UI exists.
28. **Crush runtime** — rewards use actual opposing cards removed during collision resolution, never a guessed same-number headcount.
29. **card recovery** — exact physical ID is preserved and root-action recovery recursion guards remain in force.
30. **armor penetration** — aug-052 is pre-mitigation; aug-059 defense reduction remains a separate once/combat effect.
31. **status lifecycle** — guard/protection/breakthrough/Advance/free-use state uses serialized run/player/private state and reset scopes.
32. **Event applicability** — only aug-038, 041, 044, 045 are allowed to participate in Event card-resolution semantics.
33. **Reward applicability** — only aug-038, 041, 044, 045 are allowed to participate in Reward card-resolution semantics.
34. **room matrix** — Combat=true for all 30; Event/Reward=true only for 038/041/044/045; Shop/Rest=false.
35. **reconnect** — Toughness, free-use cycle marker, Guardian/049 mark, recovered card zone, breakthrough, and Advance survive serialization/reconnect.
36. **determinism** — Guardian targets use lobby-seat ordering; no RNG target selection; same seed + same actions keep outcomes stable.
37. **privacy** — Knight state does not project another player's hidden current-cycle remaining cards.
38. **tooltip parity** — all 30 executable Knight cards are present in the PVE UI catalog and aligned to current runtime contracts.
39. **telemetry** — Knight triggers record `augmentId`, `triggerCount`, `successCount`, with relevant Toughness/redirect/recovery/crush/penetration/damage/stack metrics; explicit regression covers 041/049/051/052.
40. **positive tests count** — 30 named per-card positive cases.
41. **negative tests count** — 5 dedicated Knight negative/scope cases in the new Knight suite, plus existing cross-system negatives.
42. **high-risk tests count** — 13 named Knight-suite tests touch mandatory high-risk IDs, all 9 mandatory IDs are covered; the existing high-risk suite additionally retains 5 named 041/049/052 regressions.
43. **candidate acquisition E2E** — candidate → choose → ownership → reconnect → Stage-1 runtime activation PASS.
44. **full archetype builds** — 3 controlled Stage 1→4 builds PASS.
45. **mixed party test** — Knight + Adventurer + Rogue + Mage state/trigger isolation PASS.
46. **Adventurer regression** — Adventurer 30/30 remains executable and its runtime regression suite passes.
47. **npm test** — PASS, **730/730**, fail 0.
48. **npm run check** — PASS.
49. **npm run pve:stress:smoke** — PASS.
50. **Project Checks** — SUCCESS, **#596**; T06/T02/T00/T05/T09/T04/T03 100-seed stages and artifact uploads all succeeded.
51. **BALANCE_WARNING_005B_B** — none introduced. Existing global stress balance telemetry still reports `BALANCE_WARNING_F2` / `BALANCE_WARNING_F3`; no Knight balance values were changed to silence them.
52. **runtime blockers** — none.
53. **KNIGHT_RUNTIME_COMPLETE** — **true**.
54. **READY_FOR_PVE_CONTENT_005B_C_ROGUE** — **true**.

## Invariants preserved

- BETA v0.1 source rows unchanged.
- Stable augment IDs unchanged.
- Stress fixtures/goldens unchanged.
- No new Rogue/Mage/Berserker runtime implementation was added.
- Supabase production schema/functions were not deployed or mutated by this task.
