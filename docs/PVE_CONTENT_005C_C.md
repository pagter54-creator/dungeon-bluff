# PVE CONTENT-005C-C — Gambler Runtime (Draft)

Baseline: PR #20 HEAD `cbcbdc0306a7de7c73c99cde8bfd7ccdbb349e5a`

## Implemented in this draft
- DESIGN-C aug-211..240 contract projection added without modifying DESIGN-C.
- Gambler registry wiring added under `GAMBLER_V02`.
- Base deck kept at 1x2,2x2,3x2,4x2,5x2,6x1 and `usesStandardCycle=false`.
- Explicit DECK/HAND/DISCARD/VANISHED state normalization.
- Seeded initial shuffle and discard reshuffle using the existing deterministic RNG stream.
- Same physical card IDs preserved across zone moves.
- bounded draw/discard/vanish/unlock/history state for reconnect.
- 6/7 used special cards remain VANISHED and are excluded from normal reshuffle.
- Luck state/idempotency primitives added.
- All-In uses only the submitted judgment card for collision; partner card stays outside collision groups.
- All-In successful damage path uses SET-style sum of the two physical cards.
- All-In consumes the hand through the existing Gambler settlement path and applies the one-card next-hand penalty.
- Several fate/counting/all-in augment effects are implemented but remain unverified.

## Not complete
This branch is intentionally still Draft. Reward pre-confirm Luck, remaining draw prediction/guarantee augments, higher All-In variants, full 30 positive/negative coverage, reconnect/privacy regression, npm/check/stress, and final Project Checks remain blockers.

`GAMBLER_RUNTIME_COMPLETE = false`

`READY_FOR_PVE_CONTENT_005C_D_GUNSLINGER = false`
