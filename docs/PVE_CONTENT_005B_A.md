# PVE CONTENT-005B-A — Adventurer runtime completion

PR #17 remains a draft for the broader 005B work. This report concerns aug-001 through aug-030 only.
Runtime definitions and source precedence are in `PVE_CONTENT_005B_A_RUNTIME.json`; the eight existing DESIGN-B Adventurer entries are compared directly by tests.
The initial registry was 13/150 for 005B, including four Adventurer cards. Adding the remaining 26 yields 39/150.

## Acceptance report

1. Changed files: 20 files listed below.
2. Adventurer target count: 30.
3. Adventurer registered count: 30.
4. Adventurer EXECUTABLE count: 30.
5. Adventurer DATA_ONLY count: 0.
6. Adventurer MISSING count: 0; UNSUPPORTED: 0.
7. Overall 005B executable count: 39/150. Other-class existing executable count: 9/120. The full 005B task remains incomplete.
8. Registry audit: exact IDs aug-001..030, explicit handler manifest, hard failure for missing candidate handler.
9. Candidate pool: 30/30; correct class, archetype and stage; acquisition excludes already-owned cards.
10. Archetypes: 노련한 탐험가 10; 만능 장비꾼 10; 기적의 탐험가 10.
11. Stage progression: three integration cases traverse Stage 1 through 4 and validate each three-card offer.
12. aug-002/003/004 regression: acquisition markers, ownership, HP upgrade, third-valid streak damage, collision then EXP, retry and reconnect verified.
13. aug-012: actual LOW equipment activation grants nonstacking next DIRECT reduction 1 to the lowest-HP living ally, including self; seat resolves ties.
14. aug-013: same equipment grant gains attributed EXP +1, total equipment EXP cap 2 per combat; base EXP has its own ledger.
15. aug-014: consecutive successful FINAL_NUMBER 4↔5 adds 1; other numbers and invalid submissions break alternation. Base numbers do not drive this comparison.
16. aug-017: consecutive distinct actual equipment activations gain retrofit, cap 2; the third activation receives its category enhancement and consumes two stacks. Same category or invalid submission resets progression.
17. aug-019: overrides actual LOW/UTILITY/WEAPON equipment to reduction 2 / EXP 2 / damage 4, preserving one use per category per cycle and EXP cap 2 per combat. There is no permanent unconditional damage bonus.
18. aug-022: replaces discovery EXP 1 with EXP 2 for every party member; once per combat, distinct player ledgers.
19. aug-030: three floor discoveries followed by an actual boss victory create one party relic opportunity per run. Earliest eligible seat receives up to three seeded GENERAL candidates; the recipient confirms one through the server API. AI confirms its first candidate.
20. Base Adventurer passive: valid attack EXP +1 retained; positive Gold bonus +1 retained.
21. EXP idempotency: base and augment source ledgers are separate; identical resolution replay does not grant twice.
22. Gold idempotency: augment Gold and Adventurer base Gold have separate ledgers. Shop discount subtracts cost and never calls positive Gold modifiers.
23. Relics: duplicate filtering, inventory cap, recipient authorization, candidate validation and final confirmation recheck. Failures are terminal, with no replacement or carry.
24. Event applicability: combat damage, equipment, discovery EXP and Gold do not run during Event card resolution.
25. Reward applicability: combat damage bonuses do not alter ranking; aug-027 adds a candidate only for a valid top-two recipient; existing choice order remains.
26. Room matrix: all 30 cards tested against EVENT, REWARD, SHOP, REST; combat positives cover all cards with the corresponding acquisition/reward conditions. Real Shop and Reward integration tests cover exceptions.
27. Reconnect: 8 tests include explicit streak, equipment progression, once counter, relic opportunity and EXP state, plus acquisition, confirmation and real boss integration. Scope cleanup retains ownership.
28. Determinism: relic opportunities use the existing seeded RNG only; identical serialized states and actions produce identical candidates and results.
29. Privacy: scoped counters and grant ledgers remain under server-only augmentFramework. Relic candidates are projected only to their recipient. Other players cannot inspect current-cycle cards through these states.
30. Tooltip parity: all 30 tooltips equal runtime metadata; no placeholder “조건 달성 시” remains. aug-020 includes an equipment category selector.
31. Telemetry: all 30 positive tests assert source augment triggerCount/successCount; damage, EXP, Gold, protection, streak and relic confirmation metrics are recorded.
32. Positive tests: 30 dedicated card cases.
33. Negative tests: 13 dedicated condition, room, cap, duplicate and protection cases; additional rejection assertions appear in confirmation tests.
34. Candidate acquisition E2E: 1 real room-clear → offer → select → ownership → next-combat effect → reconnect flow.
35. Full archetype build: equipment Stage 1/2/3/4 acquired through actual offers and executed together.
36. Mixed build: equipment plus veteran streak effects coexist without state collisions.
37. npm test: 685 tests; 64 are in the Adventurer-specific test file. PASS on the source verification run.
38. npm run check: PASS.
39. Stress smoke: PASS, no hard failures. Existing goldens and fixtures are unchanged.
40. Project Checks: PR head SUCCESS is the final completion gate; consult the latest linked Actions check on PR #17.
41. BALANCE_WARNING: retain DESIGN_WARNING_EQUIPMENT_EXP_OVERLAP for aug-013/019; existing duration, burst, recovery and reference collision warnings remain diagnostics rather than runtime blockers.
42. Runtime blockers: none found in Adventurer scope.
43. ADVENTURER_RUNTIME_COMPLETE: all runtime acceptance checks are implemented and validated; final declaration requires the final PR head CI success.
44. READY_FOR_PVE_CONTENT_005B_B_KNIGHT: after that gate succeeds. No new Knight/Rogue/Mage/Berserker runtime was registered by this task.

Test categories overlap: reconnect, progression and negative assertions can be part of integration cases.
No Supabase schema changes or production deployment were performed.

## Files

- `supabase/functions/game-api/pve/adventurer-contracts.js`
- `supabase/functions/game-api/pve/adventurer-runtime.js`
- `supabase/functions/game-api/pve/augment-runtime.js`
- `supabase/functions/game-api/pve/augment-framework.js`
- `supabase/functions/game-api/pve/content-005b-runtime.js`
- `supabase/functions/game-api/pve/augments.js`
- `supabase/functions/game-api/pve/combat.js`
- `supabase/functions/game-api/pve/characters.js`
- `supabase/functions/game-api/pve/effects.js`
- `supabase/functions/game-api/pve/rooms.js`
- `supabase/functions/game-api/pve/projection.js`
- `supabase/functions/game-api/pve/api.js`
- `src/app.js`
- `src/pve-ui-catalog.js`
- `tests/pve-007-008.test.mjs`
- `tests/pve-content-005b-placeholder-runtime.test.mjs`
- `tests/pve-content-005b-adventurer.test.mjs`
- `docs/PVE_CONTENT_005B_A_RUNTIME.json`
- `docs/PVE_CONTENT_005B_A_AUDIT.json`
- `docs/PVE_CONTENT_005B_A.md`
