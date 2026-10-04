# PVE CONTENT-005F — common Augment effect framework

The framework is server authoritative inside the existing PVE run snapshot and commits through the existing `pve_try_commit` action. It does not register the unresolved 390 BETA cards as executable. Existing candidate selection remains limited to explicit executable catalog entries. Test-only definitions live only in fixtures.

## Trigger and ordering

`augment-framework.js` owns the canonical trigger vocabulary and bridges existing phase names through `applyOwnedEffects`. Each event envelope carries event, root action, parent, source, player, room, combat, turn, cycle and deterministic order IDs. Owned definitions are indexed by augment ID and trigger, then sorted by priority, augment ID and effect ID. Unsupported operations or ambiguous definitions throw `UNSUPPORTED_AUGMENT_EFFECT`.

## Stored state

`run.augmentFramework` contains per-player/augment/scope once keys, acquisition markers, statuses, delayed effects, economy grant markers, temporary rule modifiers, recovery chain counts and telemetry. It is serialized in the same run state as ownership. The client projection exposes only PUBLIC and the current owner's OWNER_PRIVATE statuses. The raw framework state, test definitions and server counters are removed from responses. TURN, CYCLE, COMBAT, ROOM, FLOOR and RUN cleanup only removes the matching temporary entries; ownership and acquisition markers survive.

## Primitive contracts

- Recovery moves the same physical card from SPENT to REMAINING, checks selected/submitted cards, records root/parent/chain/depth, and uses the existing T06 safety ceilings: depth 4, 24 derived recovery events per root. The ceiling skips and records a reason without crashing.
- Standard draw uses the standard card cycle. Gambler draw uses DRAW_PILE, HAND, DISCARD and VANISHED with the run's seeded RNG. Zone operations retain physical IDs.
- ADD, SET, MULTIPLY and EXTRA damage have separate operations. Combat-only damage is refused in Event and Reward. The existing base damage pipeline and enemy mitigation order stay unchanged; the generic operation acts on the supplied combat packet. Extra components carry source attribution.
- HEAL reports requested, actual and cap-prevented amounts; SELF_DAMAGE accepts canDown and minimumHp. Existing class base effects remain in their established adapters.
- Delayed effects store schedule, resolution, cancellation, reset, source and original combat/room. Combat-only entries are removed at combat end or skipped if the combat identity changes.
- Effective rules are computed from an immutable base and ordered ADD, OVERRIDE, CAP_CHANGE, UNLOCK, REPLACE or MULTIPLY modifiers.
- Gold, EXP and Relic grants use an application ID marker; repeat execution skips. Relic duplication is rejected unless the explicit policy permits it.

The class adapter contract exposes Gambler, Gunslinger, Ghost Swordsman, Vampire, Imp, Twins and Martial Artist hooks. The existing class handlers remain responsible for their live base rules.

## Wiring and limits

Combat, Event and Reward emit the supported shared phase hooks. Existing combat-only executable effects no longer alter Event or Reward ranking. Augment selection writes ownership and the ON_ACQUIRE marker in one authoritative action. No BETA value, class base rule, stress golden, fixture or balance number was changed. The 005R card-specific decision queue remains open, so 005B/C/D can implement only resolved cards until those decisions are made.

Verification: P01–P26 primitive tests, full suite, project check, stress smoke and GitHub Project Checks.
