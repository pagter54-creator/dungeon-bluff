# PVE CONTENT-001B — Floor 1 roster and Floor 2 handoff

Floor 1 now registers 7 Normal, 3 Elite, and 2 Boss monsters. Each has a mechanic definition, public rule summary, intent pattern, and combat phase hooks. The initial HP baseline is 90 / 160 / 240; no balance retuning is included in this change.

The boss is chosen from the two Floor 1 bosses when a run starts. A boss victory applies the existing HP, Flame, Gold, and augment rewards once. After any due augment choices, the same run advances to a 12 step Floor 2 map. The transition retains run resources and card changes, removes combat resources and monster state, and normalizes saved card cycles against the restored permanent card pool. `pve.continueFloor` only supports saved runs that were already at `FLOOR_CLEAR`.

Floor 2 room entry is deliberately guarded with `CONTENT_NOT_IMPLEMENTED`. CONTENT-002 should replace that guard when its room content is executable.

## Artwork

Existing PVE monster art: iron boar, cowardly hunter, echo bat. No matching art was found for the other nine Floor 1 monsters in the monster directory, manifests, or legacy assets. Their UI shows the monster name and rules without a generic substitute illustration. `MISSING_ASSET`: rusty ballista, gate guard dog, sewer rat swarm, graveyard sentinel, chain jailer, siege captain, iron bell keeper, fallen lord, gatebreaker colossus.

## Balance warning

The existing 100 run PVE-014 sweep, using the initial 90 / 160 / 240 HP baseline, reported Normal combat averages of 7.4–11.0 turns, Elite averages of 10.0–14.8 turns, and Boss averages of 18.6–20.7 turns in cohorts that reached the boss. These exceed the 6 / 10 / 14 turn targets. The three AI mixed cohort cleared 0/25 runs and failed mainly in Elite rooms. These are `BALANCE_WARNING` findings, not a new balance pass.

## Verification notes

The deterministic roster tests and full Floor 1 route test pass. `node scripts/check.mjs` and `node scripts/pve-stress.mjs --mode smoke` pass. The full `node --test tests/*.test.mjs` run reports six semantic golden failures in T04, T06, T09, and T14. The stress fixtures and harness rules were left unchanged. The stress smoke exit status alone does not satisfy the full golden regression gate.

`AMB-FLOOR-TRANSITION-DEVOUR`: existing `onCombatEndCharacter` sets transformed Demon Swordsman Devour to zero at combat end. The transition preserves the state produced by that canonical cleanup and does not define a new Devour number.
