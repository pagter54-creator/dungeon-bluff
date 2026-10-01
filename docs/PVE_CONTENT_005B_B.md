# PVE CONTENT-005B-B — Knight 30/30 Runtime Completion

PR #17 remains **draft**. This report covers Knight aug-031 through aug-060 only.

## Status

- Knight target: **30**
- Registered: **30**
- EXECUTABLE: **30**
- DATA_ONLY: **0**
- MISSING: **0**
- UNSUPPORTED: **0**
- Candidate pool coverage: **30/30**
- Archetypes: 불굴의 기사 10 / 수호벽 10 / 압살 기사 10
- Stage progression per archetype: **1 / 3 / 3 / 3**
- Existing Adventurer 30/30 remains protected.

## Overall 005B registry

The prior registry was 39/150, but aug-031, aug-041 and aug-051 were already executable in that count. Completing the other 27 Knight cards therefore produces the actual unique registry total:

**PVE_CONTENT_005B_EXECUTABLE = 66 / 150**

The design brief's ideal 69/150 arithmetic assumed all 30 Knight IDs were new; the actual registry is authoritative.

## Archetype runtime

### aug-031~040 — 불굴의 기사
Toughness cap/start/resource refunds, one-shot direct-damage mitigation, first HP-1 transition, first legal free Toughness use per cycle, and next-cycle recharge are implemented without changing the base 2/3/4/5/5 deck or base max Toughness 2.

### aug-041~050 — 수호벽
Guardian collision rescue uses deterministic lobby-seat ordering. One active damage protection is kept per Knight. aug-048 can rescue two allies in Combat without multiplying redirect packets. aug-045 recovers the same BASE physical cardInstanceId from SPENT to REMAINING. aug-049 gives exactly one follow-up direct redirect after the base redirect. aug-050 prevents lethal redirected damage before DOWN_RESOLVE and then grants one-shot direct protection.

### aug-051~060 — 압살 기사
All rewards use actual opposing cards removed by collision resolution. aug-052 remains pre-mitigation enemy-defense penetration 1. FINAL_NUMBER drives aug-053. aug-055 requires at least two actually removed cards. aug-057 arms only at effective max Toughness with no use that turn. aug-060 Advance is max 4 and decays after a non-crush valid attack.

## Room matrix

Only aug-038, aug-041, aug-044 and aug-045 are allowed in Event/Reward card-resolution semantics. All other Knight augment effects are Combat-only. Shop and Rest are false for all 30.

## Reconnect / determinism / privacy

Toughness, aug-038 free-use cycle marker, Guardian target/aug-049 mark, physical-card recovery state, breakthrough state and Advance state are stored in serialized run/player/private state. Guardian target selection uses deterministic seat order unless aug-046 receives an explicit legal Combat target. No current-cycle hidden hand contents are projected by these states.

## Tests

- 30 named positive Knight card cases
- three Stage 1→4 full archetype acquisition cases
- candidate acquisition → ownership → reconnect → runtime case
- reconnect state integration
- multiple-Knight deterministic state isolation
- negative room/condition/cap cases
- existing high-risk 041/049/052 regression suite retained

Final command counts and Project Checks result are updated only after the final PR head succeeds.

## Warnings / blockers

**BALANCE_WARNING_005B_B:** none newly introduced; implementation preserves contract values.

Runtime blockers: none known before final CI.

## Final flags

- KNIGHT_RUNTIME_COMPLETE = **PENDING_FINAL_CI**
- READY_FOR_PVE_CONTENT_005B_C_ROGUE = **false until final CI succeeds**
