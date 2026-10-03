# PVE CONTENT-005C-A — Seer Runtime Repair / Final Closeout

## Scope
This closeout repairs and verifies Seer `aug-151..180` only. Imp, Gambler, and Gunslinger runtime are not implemented here. DESIGN-C/BETA source data and stable augment IDs are not rewritten. No production Supabase deploy, DB mutation, or schema change is part of this work.

## Branch / PR
- Branch: `feat/pve-content-005c-a-seer`
- Draft PR: #19
- DESIGN-C baseline: `528783ff073e17b29a93d3117b0c46663d53c7eb`
- Runtime manifest: `docs/PVE_CONTENT_005C_A_RUNTIME.json`
- Audit: `docs/PVE_CONTENT_005C_A_AUDIT.json`

## Base Seer migration
Canonical Revelation is now max 3. Activation before finalized submit consumes exactly 1 Revelation, preserves same physical-card recovery, and an activation-turn valid/pass grants +1 while collision grants +0. Legacy max-1, collision-gain, and base exact selected-number inspection behavior have been removed from both the PVE Seer path and shared base Seer behavior.

## Registry / candidates
- Seer target: 30
- Registered/executable: 30/30
- DATA_ONLY / MISSING / UNSUPPORTED: 0 / 0 / 0
- Candidate reachable: 30/30
- Archetypes: 완전한 계시 10, 운명 조작자 10, 불길한 예언 10
- Stage distribution: 3 / 9 / 9 / 9
- 005C `aug-151..270` executable unique: 32 (Seer 30 + legacy `aug-181`, `aug-241`)
- Global `aug-001..270` executable unique: 182
- 005B `aug-001..150`: 150/150 retained

## Recovery / provenance
SPENT -> REMAINING recovery preserves the original physical `cardInstanceId`. Provenance records recovery owner/target, source augment, root action, combat/room, cycle, turn, and Revelation serial. Selected/submitted and TEMPORARY/TRANSFORMED/SPECIAL cards are excluded where required.

High-risk checks include:
- `aug-151`: valid use of a Revelation-recovered physical card refunds Revelation +1 once/combat.
- `aug-160`: activation/recovered strengthen paths share one once/turn +3 claim.
- `aug-161`: explicit ally target recovers the same eligible ally physical card and rejects ineligible zones/tags.
- `aug-171`: delayed prediction persists origin combat/room and expiry/cancel lifecycle.
- `aug-177`: exact READY-ally selected number is explicit augment-only and OWNER_ONLY.

## Inspection privacy
Base Revelation exposes no exact selected number. `aug-177` is the explicit inspection path. Owner/inspected-target/unrelated-player projection tests verify that only the Seer owner receives the exact selected number. Reconnect retains the owner's permitted view without leaking it to other players. Public snapshots, turn submission projection, and realtime payload checks remain hidden.

## Delayed prediction / cleanup
Prediction state is reconnect-safe, resolves once, and is cancelled/cleared on combat end. COMBAT_END also removes temporary Seer inspection data, recovery provenance for that combat, combat buffs, scoped Seer state, and applicable once-ledger entries while augment ownership persists.

## Room isolation / once / reset
Runtime contracts retain DESIGN-C room matrices and once/reset/persistence scopes. A COMBAT-only recovery effect is explicitly regression-tested not to fire in EVENT. Once-per-turn, once-per-cycle, once-per-combat, and once-per-Revelation paths are covered by actual second-trigger behavior.

## Tooltip / DESIGN-C parity
Runtime contracts are compared directly with `docs/PVE_CONTENT_005Q_DESIGN_C.json` for all 30 IDs across name, archetype, stage, trigger, condition, effect type/value, room matrix, once/reset/persistence, visibility, primitives, and tooltip. Expected result is MATCH 30, all mismatch categories 0. UI descriptions are checked against the runtime contract tooltip 30/30.

## Tests
Dedicated 005C-A test files contain 56 test declarations:
- contract/candidate/privacy/parity: 19
- per-card effect/runtime: 32
- full-build/mixed-party/reconnect integration: 5

Coverage accounting:
- actual effect positive: 30/30
- contract-appropriate negative: 30/30
- recovery effect scenarios: 20
- delayed/prediction effect scenarios: 10
- explicit high-risk cards: 5
- full archetype builds: 3
- mixed-party integration: 1
- dedicated privacy scenarios: 3
- reconnect scenarios: 3
- retry/idempotency scenarios: 2

Shared legacy Seer regression tests were also canonicalized rather than deleting their concurrency/privacy/physical-card purposes.

## Warnings / blockers
- No balance tuning was performed. `BALANCE_WARNING_005C_A`: none introduced by this repair.
- Framework blockers: 0
- Runtime blockers: 0
- Test blockers: 0
- Final closeout remains gated only on Project Checks SUCCESS on the final documentation HEAD.

## Final flags
The implementation/audit result is:
- `SEER_RUNTIME_COMPLETE = true`
- `READY_FOR_PVE_CONTENT_005C_B_IMP = true`

These flags are valid for release handoff only when this final documentation HEAD itself has Project Checks `completed / success`. If that gate fails, the closeout is not accepted and the flags must be treated as false until repaired.
