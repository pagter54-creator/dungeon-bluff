# PVE CONTENT-005A — Augment framework audit

Source of truth: GitHub branch `feat/pve-content-004-class-runtime` at `845f3e39`. This PR is an audit and guardrail update. It does not make the 390 effects executable or change stress goldens, fixtures, balance numbers, production Supabase, or the legacy IDs.

## Coverage method

[The 390-row coverage matrix](PVE_CONTENT_005A_COVERAGE.csv) enumerates the existing numeric ID slots `aug-001` through `aug-390`, 30 per class. Within each class, each archetype occupies 10 slots: stage 1 has one card, stages 2–4 have three each. A missing row is an **expected slot**, not an invented registry definition. Unknown names and effects are marked `UNKNOWN_CANONICAL_NAME` and `UNKNOWN`. Existing definitions and IDs were never renumbered.

`EXECUTABLE` means the entry has an executable runtime mapping, is selectable, survives run serialization, and has a named test. `DATA_ONLY` means a registry entry has a name but no runtime mapping. `MISSING` means no registry entry. No current definition has a partly wired runtime mapping, so `PARTIAL = 0` for the **entry-level** classification. Primitive readiness has a separate assessment below.

| Status | Count |
| --- | ---: |
| EXECUTABLE | 19 |
| PARTIAL | 0 |
| DATA_ONLY | 198 |
| MISSING | 173 |
| Conceptual slots | 390 |
| Registered definitions | 217 |
| Unique registered IDs | 217 |

| Class | Executable | Data only | Missing | Total |
| --- | ---: | ---: | ---: | ---: |
| Adventurer | 1 | 29 | 0 | 30 |
| Knight | 3 | 27 | 0 | 30 |
| Rogue | 1 | 29 | 0 | 30 |
| Mage | 3 | 27 | 0 | 30 |
| Berserker | 2 | 28 | 0 | 30 |
| Seer | 1 | 0 | 29 | 30 |
| Imp | 1 | 0 | 29 | 30 |
| Gambler | 0 | 0 | 30 | 30 |
| Gunslinger | 1 | 29 | 0 | 30 |
| Martial Artist | 1 | 0 | 29 | 30 |
| Vampire | 2 | 0 | 28 | 30 |
| Ghost Swordsman | 2 | 0 | 28 | 30 |
| Twins | 1 | 29 | 0 | 30 |

| Stage | Executable | Data only | Missing | Conceptual |
| --- | ---: | ---: | ---: | ---: |
| 1 / EXP 50 | 19 | 9 | 11 | 39 |
| 2 / EXP 150 | 0 | 63 | 54 | 117 |
| 3 / EXP 350 | 0 | 63 | 54 | 117 |
| 4 / EXP 750 | 0 | 63 | 54 | 117 |

Each archetype has ten conceptual slots. The 39 per-archetype status groups and all 390 ID/name/stage rows are in the matrix CSV. Existing rows have their stored archetype names. Missing rows use the user's supplied archetype list.

## Selection and persistence

- The four cumulative EXP thresholds are `50/150/350/750`. `dueAugmentTiers` filters out a threshold if no executable offer exists. A high EXP gain does not create duplicate choices; completed tiers live in `persistentCharacterState.augmentTiers`.
- Stage 1 offers only executable starters. Subsequent offers filter by the selected `augmentBuild`. Offers are stored in `run.augmentChoice.offersByPlayer`; reconnect returns the same pending offer. Human offers are static sorted sets. AI selection uses seeded run RNG. The current runtime does not shuffle human candidates.
- `chooseAugment` validates the offered ID, class, tier, archetype, and prior ownership. The API's action UUID, saved action result, expected version, and `pve_try_commit` guard retries and concurrent requests. An already completed direct choice is rejected. The run holds at `AUGMENT_CHOICE` until all human choices finish.
- Acquired IDs stay in `player.augments` through room/floor transitions and remain readable in terminal run state. Combat-scoped class resources are cleared separately. Existing floor and settlement regression tests cover these paths.
- **AUGMENT_POOL_SHORTAGE:** 128 of 130 conceptual candidate pools have fewer than three executable cards: 11 of 13 stage-one class pools and all 117 locked-archetype pools at stages 2–4. Knight and Mage are the only classes with three executable stage-one starters. Gambler has zero. Current fallback skips a threshold without an executable offer; it does not mix archetypes or expose data-only cards. This keeps the run moving but prevents four choices for most classes. The UI therefore renders the actual legal offer count, which can be one or two.

## Effect framework

`effects.js` has a data-driven trigger/condition/operation interpreter. It orders an owner's same-trigger effects by numeric `priority`, then effect ID. Counters use TURN, CYCLE, COMBAT, FLOOR, or RUN tokens. Ownership lives in the run. The live definitions use six generic operation types; other implemented interpreter branches are scaffolding until a concrete augment and integration test use them. Complex class-specific handlers remain in class code.

| Primitive family | Current support | Used by current augments | Test / gap |
| --- | --- | --- | --- |
| Resource set/add/cap/capture | Supported | Yes: 001, 031, 061, 091, 301 | Existing T00/T05 plus 005A ordering/once test |
| Flat damage / incoming damage | Supported | Yes: 001, 031, 061, 181, 301 | T00/T05 and class stress cases |
| Number modify / swap / steal | Partial framework | Class handlers, 111/181/301 | Existing number pipeline; generic phase metadata is absent |
| Heal / self damage / armor | Partial framework | Special handlers 101/121/131/321 | Existing T02–T04; generic self-damage/down state needs integration |
| Recover / draw / discard / cycle | Partial framework | Special handlers 161/241/351/381 | T06; generic DRAW_CARD currently delegates to spent-card recovery |
| Status / shield / mark / once flags | Partial framework | Special handlers 041/301 | Existing tests; generic status lifetime lacks explicit scope |
| Gold / EXP / Shop / Rest | Partial framework | No declarative augment yet | Handler branches exist for Gold/EXP; Shop/Rest hooks missing |
| Extra hit / execute / multiplier | Missing as generic primitives | Special class handlers only | Needs ordered damage contract and tests |
| Card pool mutation / deck zones | Missing as generic primitive | Special 241/351; Gambler base deck | Needs physical-ID, engraving, cycle tests |
| Immediate-on-acquisition effect | Missing | None currently | Must be distinct from later passive triggers |
| Explicit OVERRIDE/ADD/MULTIPLY/CAP_CHANGE/UNLOCK schema | Missing | Existing config and handlers | Define before wide rollout |

The interpreter exposes 21 operation names, but an operation's existence alone does not prove a safe augment integration. In particular, generic `RECOVER_CARD` has no T06 action-chain ceiling, generic `DRAW_CARD` uses spent-card recovery rather than a draw pile, `DAMAGE_SELF` does not process the full DOWNED/Flame flow, and generic status storage has no scope-aware cleanup. They must not be used as proof of executable coverage without dedicated tests.

The live number pipeline remains BASE_NUMBER → SELF_MODIFY → PRE_COLLISION_SWAP → PRE_COLLISION_STEAL → FINAL_NUMBER → COLLISION_GROUP → COLLISION_RESOLUTION → POST_COLLISION_EFFECTS → VALIDITY → DAMAGE. Current same-trigger order is priority → effect ID. Existing damage processing is retained; this audit does not introduce a new stacking formula. Base Berserker collision heal remains capped at HP 2 under the user's CONTENT-004 decision; `aug-131` may heal to max HP.

## Room, UI, and privacy audit

- Executable offers are server-filtered. Stage, owned augment, and offer state survive reconnect. The projection exposes only the viewer's pending offer, while chosen IDs are public. Internal effect catalog and counters are not exposed as offer data; exact Gambler hand state remains owner-only.
- The choice popup now displays the archetype, stage, name, and concrete runtime summary for all 19 executable entries. Runtime charge/stack indicators remain class-specific; a general augment-state UI contract is still missing for future effects.
- Event and Reward Room use the shared card-number path, but only concrete class/augment handlers already wired into those rooms should be considered active. Monster-only damage does not become an Event effect. No generic Shop, Rest, or Relic-plus-Augment arbitration contract is established here.
- The registry has no canonical descriptions or numeric specifications for many entries. `AUGMENT_DESCRIPTION_MISMATCH` therefore cannot be ruled out across the 390 slots. The new choice summaries describe the existing executable behavior; they do not replace missing canonical design text.
- RUN_CLEAR keeps acquired IDs for summary and does not re-run choice application. Immediate-on-acquisition effects do not yet exist.

## High-risk effects and implementation batches

**HIGH_RISK:** recovery loops and same-ID zones; cycle reset and Full Burst; Gambler deck mutation/unlock/vanish; Twins parity; Vampire swap; Imp steal; Ghost Swordsman Devour and reactivation; max HP/cap changes; delayed triggers; multiple same-trigger augments; Relic ordering. Require primitive, definition, integration, reconnect, and privacy tests when these are implemented.

| Batch | Classes | Conceptual cards | Currently executable | Current data only | Current missing |
| --- | --- | ---: | ---: | ---: | ---: |
| CONTENT-005B | Adventurer, Knight, Rogue, Mage, Berserker | 150 | 10 | 140 | 0 |
| CONTENT-005C | Seer, Imp, Gambler, Gunslinger | 120 | 3 | 29 | 88 |
| CONTENT-005D | Martial Artist, Vampire, Ghost Swordsman, Twins | 120 | 6 | 29 | 85 |

**AMB-AUGMENT-STRUCTURE-KNIGHT:** The supplied canonical archetype labels say `불굴` and `압살`, while the existing saved build names and stage-one cards are `불굴의 기사` and `압살 기사`. This audit retains the persisted names and IDs. Migration/alias semantics are not defined.

**Blockers for full 390-card readiness:** 173 definitions, canonical names/effect specifications for missing slots, 128 full-size candidate pools, and generic safety contracts above. These are tracked for CONTENT-005B–005D rather than exposed to production during 005A.
