# PVE CONTENT-005B-FINAL — Final Acceptance / Integration / Release Gate

Audited code HEAD: `e358d2d91a735be9beb96e3b65dcd652c4eff184`  
PR: #17 — **Draft 유지**  
Scope: `aug-001..150` / Adventurer, Knight, Rogue, Mage, Berserker  
Source of truth: DESIGN-B runtime specs + 005Q overlay + 005R + BETA v0.1 + implemented runtime + 005B-A..E audits.

This FINAL pass introduced no new gameplay design, no balance tuning, no 005C runtime, and no production Supabase mutation. The only code changes before this report were acceptance-test coverage and the FINAL 500-seed CI gate.

## Final acceptance report

1. **Final HEAD** — audited code HEAD `e358d2d91a735be9beb96e3b65dcd652c4eff184`; final documentation commit is the next commit.
2. **PR 상태** — PR #17 remains Draft. No Ready-for-review transition and no merge performed.
3. **변경 파일** — FINAL-stage code changes: `.github/workflows/check.yml`, `tests/pve-content-005f-route.test.mjs`; this publication adds `docs/PVE_CONTENT_005B_FINAL.md` and `docs/PVE_CONTENT_005B_FINAL_AUDIT.json`.
4. **전체 registry** — aug-001..150 exact set, 150/150 executable.
5. **per-class counts** — Adventurer 30, Knight 30, Rogue 30, Mage 30, Berserker 30.
6. **DATA_ONLY/MISSING/UNSUPPORTED** — 0 / 0 / 0; duplicate IDs 0.
7. **candidate reachability** — 150/150 reachable through gameplay candidate pipeline.
8. **stage/archetype audit** — each class = 3 archetypes × 10; Stage 1/2/3/4 = 3/9/9/9.
9. **silent no-op audit** — 0. Each class audit has 30 positive runtime card cases.
10. **unreachable handler audit** — 0. Candidate coverage + executable registry are complete.
11. **base class invariant audit** — PASS for Adventurer EXP/Gold, Knight Toughness, Rogue Event solo-lowest, Mage Mana, Berserker base damage/self-damage/collision heal.
12. **canonical number pipeline audit** — PASS; no FINAL_NUMBER-sensitive path bypass found.
13. **damage taxonomy audit** — PASS for ADD/SET/MULTIPLY/EXTRA_DAMAGE_COMPONENT/SEPARATE_HIT/DIRECT/SELF_DAMAGE separation.
14. **DOWN_RESOLVE audit** — PASS; same-resolve prevention precedes DOWN_RESOLVE and Flame consumption remains DOWN-only.
15. **Event applicability** — PASS; combat-only damage/Poison/Revenge/heal/extra-hit contamination blocked unless contracted.
16. **Reward applicability** — PASS; ranking is not modified by combat-only damage.
17. **Shop/Rest applicability** — PASS; no unintended trigger leakage.
18. **room matrix** — PASS across COMBAT/EVENT/REWARD/SHOP/REST contracts.
19. **reconnect** — PASS per class plus Full Expedition reconnect at Floor 1 mid-combat and Floor 3 map entry.
20. **privacy** — PASS; current-cycle used/remaining cards and pre-reveal selected card remain private, owner/public projection stays separated.
21. **determinism** — PASS in seeded candidate/target/recovery/status/relic/AI/damage/stress replay paths.
22. **idempotency** — PASS for acquisition/ON_ACQUIRE/economy and run settlement retry behavior.
23. **status lifecycle** — PASS; source/owner/target/stacks/cap/expiry lifecycle covered and no orphan-state blocker found.
24. **recovery** — PASS; same physical `cardInstanceId` recovery and recursion guards preserved.
25. **delayed effects** — PASS; scoped restore/cancel/no-old-combat-leak behavior covered.
26. **economy** — PASS; EXP/Run Gold/relic attribution and retry duplication protections preserved.
27. **tooltip** — PASS 150/150 concrete entries; placeholder count 0.
28. **telemetry** — PASS; augment trigger/success telemetry remains available.
29. **Adventurer acceptance** — PASS, including EXP idempotency, equipment tracking, relic duplicate/full-inventory behavior.
30. **Knight acceptance** — PASS, including Toughness, guard overwrite, physical recovery, pre-mitigation penetration.
31. **Rogue acceptance** — PASS, including post-collision soloLowest, Poison cap, same-card recovery, recursion guard.
32. **Mage acceptance** — PASS, including Mana spend/refund, deterministic heal, cleanse source, SELF_MODIFY, symmetry cap.
33. **Berserker acceptance** — PASS, including self-damage taxonomy, DIRECT-only Revenge, HP1, extra-hit recursion, first-HP1 once/combat.
34. **mixed-party matrix** — PASS.
35. **cross-class interactions** — PASS for Mage→collision→Rogue ordering and Knight/Berserker, Mage/Berserker, Mage/Rogue, Knight/Rogue interactions.
36. **full build tests** — PASS for Stage 1–4 build coverage of all five classes.
37. **candidate progression E2E** — PASS through EXP threshold → Stage1 → Stage2 → Stage3 → Stage4.
38. **Full Expedition RUN_CLEAR** — PASS with actual 005B augments, Floor1 → Floor2 → Floor3 → final boss.
39. **Full Expedition reconnect** — PASS with two reconnect points.
40. **settlement** — PASS; RP unchanged for PVE, permanent runGold commit is idempotent, no duplicate reward.
41. **failure path** — PASS for Flame0 + all DOWN → RUN_FAILED.
42. **boss-kill+wipe invariant** — PASS; same-resolve boss kill + full wipe + Flame0 resolves to RUN_FAILED.
43. **abandon path** — PASS; ABANDONED permanent Gold remains 0.
44. **npm test** — PASS in Project Checks #662.
45. **npm run check** — PASS; 196 JS/TS files parsed and local module/HTML references checked.
46. **stress smoke** — PASS.
47. **500-seed stress** — PASS gate for T00/T02/T03/T04/T05/T06/T09/T14, 500 seeds each (4,000 scenario-seeds total).
48. **hard failures** — 0.
49. **balance warnings** — non-blocking diagnostics only; observed families include reference collision fairness, repeated burst, turn-length warnings, plus existing F2/F3 balance warnings. No FINAL balance tuning performed.
50. **performance sanity** — PASS; no release-blocking regression or infinite-loop failure surfaced in stress/CI.
51. **stale state/memory audit** — PASS; lifecycle/reset suites and stress found no release-blocking state-growth/corruption.
52. **backward compatibility** — PASS; missing-field restore defaults remain non-crashing in existing reconnect coverage.
53. **final docs** — this report + machine audit JSON.
54. **Project Checks** — pre-publication code HEAD: #662 SUCCESS. A new run on the documentation HEAD is required and must succeed before the release gate is considered operationally closed.
55. **RELEASE_BLOCKERS** — 0.
56. **DESIGN_BLOCKERS** — 0.
57. **BALANCE_WARNING_005B_FINAL** — present as diagnostics only; no blocker.
58. **PVE_CONTENT_005B_FINAL_ACCEPTED** — **true**.
59. **MERGE_RECOMMENDED** — **true**. This is a recommendation flag only; no merge performed.
60. **READY_FOR_PVE_CONTENT_005C_DESIGN** — **true**. 005C runtime implementation remains prohibited until this FINAL publication gate has a successful documentation-head CI.

## Stress gate

The existing harness's real 500-seed command is `npm run pve:stress:full` (`--mode stress`). FINAL CI runs it separately for T00, T02, T03, T04, T05, T06, T09, and T14. Project Checks #662 completed the whole matrix with zero hard failures. Balance warnings remain diagnostics by contract and were not tuned away.

## Release decision

All requested 005B release blockers and design blockers are clear. The code is **merge-recommended** from the 005B acceptance perspective, while PR #17 intentionally remains Draft until the user explicitly asks to mark it Ready for review. No automatic merge is authorized.

The only remaining operational step after this document commit is confirming **Project Checks SUCCESS on the documentation HEAD itself**.
