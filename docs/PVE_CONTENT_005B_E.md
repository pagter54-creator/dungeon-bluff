# PVE CONTENT-005B-E — Berserker 30/30 Runtime Completion

PR #17 remains **draft**. This report covers aug-121~150 and the full aug-001~150 acceptance sweep. Final acceptance is valid only when the latest documentation-head Project Checks is SUCCESS.

1. **변경 파일** — `berserker-contracts.js`, `berserker-runtime.js`, `augment-runtime.js`, `content-005b-runtime.js`, `characters.js`, `effects.js`, `src/pve-ui-catalog.js`, Berserker/full-expedition tests, registry expectation, and 005B-E docs/audit/runtime.
2. **Berserker target count** — 30.
3. **registered count** — 30.
4. **EXECUTABLE count** — 30.
5. **DATA_ONLY count** — 0.
6. **MISSING count** — 0.
7. **UNSUPPORTED count** — 0.
8. **전체 005B executable count** — **150/150** unique IDs. Previous 122/150 already contained aug-121 and aug-131, so this batch adds 28 unique executable IDs.
9. **aug-121~150 registry audit** — exact 30 IDs resolve to executable runtime handlers; candidate validation rejects missing handlers.
10. **candidate pool coverage** — 30/30.
11. **archetype coverage** — 피의 광전 10 / 불사 투사 10 / 최후의 격노 10.
12. **Stage progression** — each archetype 1 / 3 / 3 / 3; controlled acquisition reaches Stage 4 without cross-build offers.
13. **aug-121~130 피의 광전** — actual HP-cost attacks drive damage, next-turn windows, heal-fed Meal/Vigor, Blood Storm, refund and post-hit healing.
14. **aug-131~140 불사 투사** — collision-heal cap override, DIRECT-only Revenge, Wound Memory, lethal protection, Brawl and one-shot retaliation guard.
15. **aug-141~150 최후의 격노** — maxHP/HP1 rules, Rage, Rampage, collision-heal conversion, high-number guard, first-HP1 Great Rage and nonrecursive extra damage.
16. **aug-121** — only an actual base Berserker HP decrease on a valid attack grants the +2 Blood Frenzy damage; HP1 produces no cost/bonus.
17. **aug-124** — effective heal >0 arms the next actual HP-cost valid attack +2 once/combat.
18. **aug-128** — actual HP-cost streak creates Blood Storm to cap 4; current attack gets +1/stack; first reach 4 queues one extra damage component 2.
19. **aug-129** — effective self-heals store Vigor to cap 3; next actual HP-cost valid attack consumes all for +2/stack.
20. **aug-130** — successful actual HP-cost attack refunds HP1 after damage, once/turn, using base heal cap2 unless aug-131 raises it.
21. **aug-131** — collision heal cap becomes maxHP; only monster DIRECT actualDamage>0 yields Revenge; next valid consumes Revenge for +2.
22. **aug-133** — an attack that actually consumes Revenge gets +1.
23. **aug-136** — monster DIRECT actual HP loss gains Wound Memory once/turn to cap3; next Revenge attack consumes all for +1/stack.
24. **aug-137** — a successful Revenge-consume valid attack heals HP1 once/combat, including when base self-cost is 0 at HP1.
25. **aug-139** — alternating effective self-heal / monster DIRECT hit gains Brawl to 4; valid attacks gain +1/stack; at 2+ the next direct hit reduces 1 and consumes one stack once/turn.
26. **aug-140** — actual monster DIRECT damage arms the next Revenge attack +4; that success arms one nonstacking next-direct -1 guard.
27. **aug-143** — authoritative HP1 valid streak builds Rage to 3 and applies the new stack to the current attack; invalid or HP>1 clears it.
28. **aug-145** — two consecutive HP1 valid attacks arm Rampage; the next two valid attacks gain +2; healing above HP1 clears it; once/combat.
29. **aug-146** — first HP1 collision heal per combat is converted from heal1 to one next-monster-direct -1 guard; HP remains 1.
30. **aug-147** — HP1 FINAL_NUMBER 4/5 valid success arms one nonstacking next-monster-direct -1 guard.
31. **aug-148** — third consecutive HP1 valid success gets +4 and queues separate extra damage 2 once/combat; follow-up cannot recursively re-trigger it.
32. **aug-149** — first actual 2+→1 HP transition only; next turn starts a 2-turn Great Rage, each active turn first valid +3, with one monster-direct -1 use; re-entry never retriggers.
33. **aug-150** — maxHP1; all valid attacks +3; combat start grants Blood Armor that nullifies one DIRECT hit.
34. **base self-damage invariant** — deck 1/2/4/4/5, base valid +1, post-hit self-cost1, minHP1, cannotDown preserved.
35. **augment self-damage semantics** — kept separate from `BASE_BERSERKER_SELF_DAMAGE`; no global rule conflation.
36. **Revenge runtime** — DIRECT monster actualDamage>0 only; blocked/absorbed/self/indirect damage do not create Revenge.
37. **collision heal runtime** — base amount1/cap2 preserved; aug-131 changes cap only; aug-132/135/146 extend the resolver without replacing base rules.
38. **HP1 runtime** — authoritative `player.hp === 1`; pendingDown/pre-heal/predicted HP are not treated as HP1.
39. **first-HP1 tracking** — combat-scoped serialized state, one real transition only; heal/re-entry regression included.
40. **Rampage** — serialized two-charge state, once/combat, cleared by healing above HP1.
41. **extra-hit runtime** — aug-128/148 use attributed follow-up damage components; followUp/depth guards prevent recursive chains.
42. **lethal/down ordering** — incoming mitigation/protection precedes actual damage/pending down; aug-138 survival prevents DOWN_RESOLVE rather than reviving DOWNED.
43. **Event applicability** — Berserker combat damage/self-damage/Revenge/HP1 augment runtime is Combat-only.
44. **Reward applicability** — combat damage/self-damage/Revenge bonuses do not affect Reward ranking.
45. **room matrix** — Combat 30/30; Event 0; Reward 0; Shop 0; Rest 0.
46. **reconnect** — HP/maxHP plus Wound/Rage/Rampage/firstHp1/protection state are serialized; acquisition reconnect test included.
47. **determinism** — no Berserker RNG target choice; same actions preserve damage/heal/stacks/outcomes.
48. **privacy** — Berserker state is server-scoped; no peer hidden card-zone projection added.
49. **tooltip parity** — concrete UI entries exist for aug-121~150; full aug-001~150 audit rejects placeholder descriptions.
50. **telemetry** — per-source augment trigger/success plus HP-cost, bonus/extra damage, heal/collision, Revenge, Rage/stack, first-HP1 and protection metrics; non-owned false telemetry removed.
51. **positive tests count** — 30 named per-card positive cases.
52. **negative tests count** — dedicated room/state negative coverage plus existing T04 semantic golden for base HP floor, collision caps, DIRECT Revenge and self-damage exclusion.
53. **self-damage tests** — aug-121 real post-hit cost test plus existing T04 F1/F2/F7.
54. **Revenge tests** — aug-131/133/136/137/140 positives plus T04 F5/F6/F7 and actualDamage=0 rules.
55. **HP1 tests** — 141~150 positives plus explicit aug-149 re-entry regression.
56. **extra-hit tests** — aug-128/148 positives plus explicit follow-up recursion regression.
57. **high-risk tests** — all mandatory 18 IDs 121/124/128/129/130/131/133/136/137/139/140/143/145/146/147/148/149/150 have named coverage.
58. **candidate acquisition E2E** — real Stage-1 offer → choose → ownership → clone/reconnect → combat runtime activation.
59. **full archetype builds** — 3 actual candidate/choose Stage1→4 acquisition tests.
60. **mixed party** — Berserker + Mage + Rogue + Knight state isolation; existing Adventurer + Knight + Rogue + Mage integration retained.
61. **Adventurer regression** — 30/30 preserved.
62. **Knight regression** — 30/30 preserved.
63. **Rogue regression** — 30/30 preserved.
64. **Mage regression** — 30/30 preserved.
65. **full aug-001~150 registry audit** — **150/150 executable**, DATA_ONLY/MISSING/UNSUPPORTED all 0 in target range.
66. **full candidate audit** — five classes ×30 reachable executable cards; class/build/stage checked by class suites and full audit.
67. **full tooltip audit** — all aug-001~150 have UI entries and concrete descriptions.
68. **full reconnect audit** — all five classes retain at least one explicit state/acquisition reconnect regression.
69. **full class matrix** — base/no-augment regressions remain; each class has Stage1→4 controlled build coverage.
70. **Full Expedition RUN_CLEAR E2E** — actual 005B augments equipped on Berserker/Mage/Rogue/Knight; Floor1 → Floor2 → Floor3 → final boss → RUN_CLEAR through the real PVE API route.
71. **npm test** — expected suite total **853** after this batch; final documentation-head CI is authoritative.
72. **npm run check** — required final gate.
73. **stress smoke** — required final gate; fixtures/goldens unchanged.
74. **Project Checks** — final documentation HEAD must be SUCCESS; code-head success alone is insufficient.
75. **BALANCE_WARNING_005B_E** — no values changed for balance; DESIGN_WARNING_STAGE4_BURST remains a diagnostic for aug-128/148.
76. **runtime blockers** — none known; final documentation-head CI is the release gate.
77. **BERSERKER_RUNTIME_COMPLETE** — **true** once final documentation-head Project Checks is SUCCESS.
78. **PVE_CONTENT_005B_EXECUTABLE** — **150/150**.
79. **READY_FOR_PVE_CONTENT_005B_FINAL** — **true** once the same final gate succeeds.
80. **READY_FOR_PVE_CONTENT_005C_DESIGN** — **true** once the same final gate succeeds.

## Invariants preserved

- BETA v0.1 source rows unchanged.
- Stable augment IDs unchanged.
- Existing stress fixtures/goldens unchanged.
- Supabase production function deploy / DB mutation / schema change were not performed.
