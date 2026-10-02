# PVE CONTENT-005B-D — Mage 30/30 Runtime Completion

PR #17 remains **draft**. This report covers aug-091~120. Final completion declaration requires the latest documentation-head Project Checks SUCCESS.

1. **변경 파일** — `mage-contracts.js`, `mage-runtime.js`, augment registry/dispatcher/candidate validation, character mana/White Magic hooks, collision correction, UI catalog, Mage tests, registry regression expectation, and 005B-D runtime/audit/docs.
2. **Mage target count** — 30.
3. **registered count** — 30.
4. **EXECUTABLE count** — 30.
5. **DATA_ONLY count** — 0.
6. **MISSING count** — 0.
7. **UNSUPPORTED count** — 0.
8. **전체 005B executable count** — **122/150**. Previous 95/150 already included aug-091, aug-101, aug-111, so this batch adds 27 unique IDs.
9. **aug-091~120 registry audit** — all 30 IDs resolve to executable Mage handlers; candidate generation validates the handler.
10. **candidate pool coverage** — 30/30.
11. **archetype coverage** — 대마도 증폭 10 / 백마도사 10 / 역산술 10.
12. **Stage progression** — each archetype is 1 / 3 / 3 / 3 across Stage 1~4.
13. **aug-091~100 대마도 증폭** — max Mana, turn recovery, spend/refund, full-Mana snapshots, burst and next-turn recovery state use serialized Mage state.
14. **aug-101~110 백마도사** — deterministic collision healing, actual-heal followups, protection, cleanse, chain heal and blessing effects are source-attributed.
15. **aug-111~120 역산술** — SELF_MODIFY handles ± direction; successful direction history, symmetry, refunds and collision corrections remain separate.
16. **aug-095** — full-Mana state is captured at TURN_START before spending, so the same turn's valid amplified attack gains +2.
17. **aug-098** — valid amplified attack refunds floor(Mana spent / 2), capped at 2 per turn.
18. **aug-101** — Mana-modified collision remains invalid but heals one collided ally by earliest lobby seat; self is excluded.
19. **aug-102** — actual White Magic heal from HP 1 grants one nonstacking next-DIRECT reduction, once/combat.
20. **aug-103** — actual heal refunds exactly Mana 1 once/turn; overheal 0 does not trigger.
21. **aug-104** — actual heal grants target next valid attack +2, nonstacking, once/combat grant.
22. **aug-107** — after actual heal, removes one earliest monster-origin harmful status deterministically.
23. **aug-109** — actually healed ally gains nonstacking next-DIRECT reduction 1.
24. **aug-111** — spend 2/4 modifies number by ±1/±2 in SELF_MODIFY; result remains within 0~6 and downstream uses FINAL_NUMBER.
25. **aug-112** — valid downward Reverse Math refunds Mana 1 once/turn.
26. **aug-114** — opposite direction from previous valid Reverse Math gives +1; invalid use does not overwrite successful direction history.
27. **aug-116** — spend 4 / magnitude 2 valid Reverse Math arms +1 natural Mana recovery next turn, once/combat.
28. **aug-119** — spend 4 / downward magnitude 2 valid Reverse Math adds +3 damage.
29. **aug-120** — alternating valid directions build symmetry to max 4; same direction or invalid Reverse Math decays 1; current valid attack gains +1 per stack.
30. **Mana runtime** — base max 4 and natural +1 remain; aug-091/092/099 extend max through runtime rules; illegal skill use does not spend Mana.
31. **White Magic runtime** — healing is collision-derived, deterministic and self-excluding; max HP is respected.
32. **heal/cleanse runtime** — only effective heal drives actual-heal followups; cleanse is monster-origin harmful-only and deterministic.
33. **Reverse Magic runtime** — Mana spend → SELF_MODIFY → collision → validity → refund/stack ordering is preserved.
34. **direction history** — only valid Reverse Math updates successful direction; reconnect preserves it.
35. **symmetry runtime** — aug-117 cap 3 and aug-120 cap 4 are independent scoped state.
36. **Event applicability** — combat-only damage/heal/cleanse/protection effects do not execute in Event.
37. **Reward applicability** — combat-only bonuses do not affect Reward ranking.
38. **room matrix** — Combat 30/30; Event 0; Reward 0; Shop 0; Rest 0 for this augment runtime batch.
39. **reconnect** — Mana, max modifier, direction, symmetry and White Magic scoped state are serialized.
40. **determinism** — White Magic target order, cleanse order and collision correction are deterministic.
41. **privacy** — Mage runtime uses public HP/resources and server-only Mage state; no peer hidden current-cycle card zones are exposed.
42. **tooltip parity** — UI catalog has concrete descriptions for aug-091~120; no placeholder text.
43. **telemetry** — source augment telemetry records trigger/success plus Mana, damage, heal/protection/cleanse and reverse/symmetry metrics.
44. **positive tests count** — 30 per-card positive cases.
45. **negative tests count** — 3 dedicated negative/scope regressions.
46. **Mana tests count** — 10 archetype positive cases plus legality/refund negatives.
47. **heal/cleanse tests count** — 10 White Magic positive cases plus overheal/source negative coverage.
48. **reverse-magic tests count** — 10 Reverse Magic positive cases plus direction/decay negatives.
49. **high-risk tests count** — all 14 mandatory IDs have named positive/regression coverage.
50. **candidate acquisition E2E** — Stage-1 offer → choose → ownership → reconnect → runtime activation covered.
51. **full archetype builds** — three controlled Stage 1→4 builds covered.
52. **mixed party** — Mage + Rogue + Knight + Adventurer state isolation covered.
53. **Adventurer regression** — remains 30/30.
54. **Knight regression** — remains 30/30.
55. **Rogue regression** — remains 30/30.
56. **npm test** — latest code-head test step PASS; expected final suite total 811, final documentation-head CI is the publication gate.
57. **npm run check** — latest code-head check step PASS.
58. **stress smoke** — final documentation-head run must PASS; fixtures/goldens are unchanged.
59. **Project Checks** — final documentation-head SUCCESS required.
60. **BALANCE_WARNING_005B_D** — none introduced; no balance value was changed merely to silence diagnostics.
61. **runtime blockers** — none known after test/check pass; final stress/CI remains the publication gate.
62. **MAGE_RUNTIME_COMPLETE** — **true**, conditional on final documentation-head Project Checks SUCCESS.
63. **READY_FOR_PVE_CONTENT_005B_E_BERSERKER** — **true**, conditional on the same final gate.

## Invariants preserved

- BETA v0.1 source rows unchanged.
- Stable augment IDs unchanged.
- Stress fixtures/goldens unchanged.
- Adventurer / Knight / Rogue each remain 30/30.
- No new Berserker runtime completion was added.
- Supabase production schema/functions were not mutated or deployed by this batch.
