# PVE CONTENT-005C-B — Imp Runtime Completion

## Scope
This batch implements and closes Imp `aug-181..210` only. The baseline is the completed Seer runtime branch/PR #19. No new Gambler or Gunslinger runtime is introduced, no balance tuning is performed, and no production Supabase deploy, database mutation, or schema change is part of this work.

## Branch / PR
- Branch: `feat/pve-content-005c-b-imp`
- Draft PR: #20
- Baseline Seer HEAD: `ddbee335788cf83f518220e4665f6ef130189061`
- DESIGN-C source: `docs/PVE_CONTENT_005Q_DESIGN_C.json`
- Runtime manifest: `docs/PVE_CONTENT_005C_B_RUNTIME.json`
- Audit: `docs/PVE_CONTENT_005C_B_AUDIT.json`

## Registry / candidates
- Target: 30 cards, `aug-181..210`
- Registered/executable: 30/30
- DATA_ONLY / MISSING / UNSUPPORTED: 0 / 0 / 0
- Candidate reachable: 30/30
- Archetypes: 대담한 슬쩍 10, 소매치기 악동 10, 장난의 연쇄 10
- Stage distribution: 3 / 9 / 9 / 9
- Cross-build lock is preserved after Stage 1 acquisition.
- 005C `aug-151..270` executable unique: 61
- Global `aug-001..270` executable unique: 211
- 005B `aug-001..150`: 150/150 retained
- Seer `aug-151..180`: 30/30 retained

## Base Imp migration
Canonical number ordering is:
`BASE_NUMBER → SELF_MODIFY → PRE_COLLISION_SWAP → PRE_COLLISION_STEAL → FINAL_NUMBER → COLLISION_GROUP → COLLISION_RESOLUTION → POST_COLLISION_EFFECTS → VALIDITY → DAMAGE`.

Imp steal runs only in `PRE_COLLISION_STEAL`. Eligible victims are non-Imp players whose working number matches the Imp at the steal window. Victim numbers floor at 0. Requested steal and actual stolen amount are tracked separately; the Imp gains only the actual amount removed. Multiple victims record both total stolen amount and distinct positive-amount victim count.

Multiple Imps resolve deterministically by lobby seat then player ID. Later Imps observe already-mutated values. FINAL_NUMBER and collision grouping are computed from the post-steal values; no pre-steal collision cache is reused.

## High-risk runtime
- `aug-181`: bonus requires at least two distinct victims with positive actual stolen amount. Zero-amount victims do not count; same root retry is idempotent.
- `aug-201`: Mischief is applied on steal, consumed by the target's next-turn valid attack, and repeat steal removes the mark and applies the declared explosion damage. Lethal explosion enters pending-down state rather than immediately finalizing DOWNED, preserving Q09 same-resolve protection/heal-before-DOWN_RESOLVE ordering. Already-DOWNED targets are never revived or reprocessed.
- `aug-203`: one repeat-steal explosion can be prevented per combat without reviving an already-DOWNED player.

## Mischief / chain safety
Mischief ownership is scoped by owner/target and survives reconnect through serializable run state. Derived Mischief effects carry root-action attribution and do not reopen `PRE_COLLISION_STEAL`. Repeated processing of the same steal root is ignored, preventing recursive steal chains and duplicate telemetry.

## Stored-number archetype
`aug-191..200` uses the stored-number resource instead of inventing a score/gold transfer model. Storage caps, spend limits, delayed attack/defense choices, refunds, and combat-start state are implemented from DESIGN-C. Event/Reward execution is restricted to cards whose room matrix explicitly permits it; combat-only damage or Mischief effects are not converted into noncombat rewards.

## Room / reset / reconnect / privacy
- Room matrices are copied from DESIGN-C and enforced at runtime.
- TURN/CYCLE/COMBAT and run-persistent scopes are separated.
- Combat Mischief, transient buffs, processed roots, and combat-scoped state are cleaned on scope exit.
- Reconnect preserves stolen-number state, Mischief ownership, once flags, delayed state, and independent multi-Imp state.
- Imp runtime does not expose hidden pre-reveal selected numbers. Only normal reveal/result final values become public.

## Cross-class ordering
Regression coverage locks:
- Mage SELF_MODIFY before Imp steal.
- PRE_COLLISION_SWAP remains before Imp steal.
- Knight collision override after post-steal FINAL_NUMBER/collision formation.
- Rogue soloLowest from post-steal final values.
- Seer private inspection/recovery state remains isolated from Imp hidden information.

## DESIGN-C / tooltip parity
All 30 runtime entries are compared against DESIGN-C contract fields and report `EXECUTABLE_MATCH`. Tooltip text is linked to `tooltipBetaV02` for all 30 cards. Source DESIGN-C and BETA v0.1 files remain byte-identical to the Seer baseline.

## Tests
Dedicated 005C-B test files contain 57 test declarations:
- contract/parity/cleanup/high-risk: 9
- per-card effect tests: 31
- candidate/ordering/privacy/reconnect/count integration: 12
- Event/Reward/full-build integration: 5

Coverage:
- actual effect positive: 30/30
- contract-appropriate negative: 30/30
- multiple-Imp deterministic ordering: covered
- collision recompute: both post-steal pass/create cases covered
- aug-201 pending-down / already-DOWNED behavior: covered
- recursion/idempotency: covered
- Event/Reward isolation: covered
- cross-class ordering: Mage, Knight, Rogue, Seer
- full archetype builds: 3/3

## Warnings / blockers
- `BALANCE_WARNING_005C_B`: no tuning was performed. Existing stress turn-length warnings remain observational and are not hard failures.
- FRAMEWORK_BLOCKERS: 0
- RUNTIME_BLOCKERS: 0
- TEST_BLOCKERS: 0

## Final flags
Implementation and audit result:
- `IMP_RUNTIME_COMPLETE = true`
- `READY_FOR_PVE_CONTENT_005C_C_GAMBLER = true`

These flags are valid only when Project Checks on the final documentation HEAD complete successfully. PR #20 remains Draft and must not be marked Ready or merged without separate user instruction.
