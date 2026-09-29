# PVE CONTENT-004 — 13-class runtime audit

This audit targets the PVE engine in PR #10, based on CONTENT-003. It does not change production Supabase state, stress goldens, stress fixtures, class balance numbers, or the 390-card augment backlog.

## Before implementation

The original server-side `PVE_CHARACTER_DEFS` contained twelve classes. The lobby mapping rejected Gambler even though the competitive game had an eleven-card Gambler implementation. All twelve supported classes had executable core code, but the requested full expedition and every-room class matrix had not been verified. Classification below uses the complete CONTENT-004 checklist, so an unverified path is PARTIAL.

| Class | Before | Concrete finding |
| --- | --- | --- |
| Adventurer | PARTIAL | Combat EXP and positive combat Gold were present; Event Gold bypassed the bonus. |
| Knight | PARTIAL | Toughness was present; duplicate-class and room interactions needed audit. |
| Rogue | PARTIAL | Solo-lowest combat and Event effects were present; full-route verification absent. |
| Mage | PARTIAL | Number modification was present; Reward Room accepted intent without common skill validation. |
| Berserker | PARTIAL | Attack self-cost and collision heal were present; base heal capped at HP 2. |
| Seer | PARTIAL | Private peek and same-ID recovery were present; reconnect matrix incomplete. |
| Imp | PARTIAL | One-Imp steal was present; two Imps hard-failed. |
| Gambler | MISSING | PVE lobby rejected it; no deck, hand, discard, vanish, or unlock runtime. |
| Gunslinger | PARTIAL | Full Burst was present; full-route verification absent. |
| Martial Artist | PARTIAL | Combo was present; collision score penalty absent. |
| Vampire | PARTIAL | Mark and swap were present; duplicate/room matrix incomplete. |
| Ghost Swordsman | PARTIAL | Devour and Ghost Slash were present; floor persistence matrix incomplete. |
| Twins | PARTIAL | Parity and Acrobatics were present; full-route matrix incomplete. |

## Implemented and audited

- Registered Gambler as the thirteenth PVE class, with 1–5 twice plus one 6. Physical IDs are stable through draw, hand, discard, vanish, unlock, reconnect, room transitions, and floor transitions. Drawing consumes deterministic run RNG. Used physical 6/7 cards vanish. Distinct final submissions from 1–5 charge additional 6/7 cards in the discard pile. Active special-card count has a cap of two, following the existing competitive runtime.
- The Gambler does not enter the standard five-card cycle. Its card zones persist in `run.cardCycles` and are copied to the current combat, Event, or Reward Room state. Shop card replacement remains forbidden.
- Owner projection includes exact private physical card zones. Other players see only the public pile counts and number composition; the current hand and ordered physical IDs stay hidden. The gameplay UI shows the owner's two-card hand and deck counters.
- Applied the Adventurer positive Gold bonus to Event reward grants, once, with the actual awarded amount in the Event result.
- Reused the competitive engine's snapshot and seat-order rule for multiple Imps. Both Imps may steal from the same non-Imp target; each successful steal respects the victim's current minimum of zero. Collision groups use the resulting final values.
- Validated Reward Room skill intent before committing the card, including Mage mana, Knight charge, Vampire thrall, and Gunslinger readiness.
- Added Martial Artist collision score loss to combat, Event, and Reward Room, and projected the score alongside EXP. The combo bonus remains combat damage only.
- Corrected gameplay UI resource mapping for combo, prior card, and Devour.
- Added 13-class full-expedition wiring fixtures and the three requested mixed parties. These fixtures control monster HP, HP, and Flame; they test state movement and no softlock, not balance.
- Added all-class AI legal-action and room-entry checks; cross-class Mage → Vampire → Imp → Knight phase order; duplicate-Imp conservation; Gambler zone, reconnect, projection, and replay checks.

## Lifecycle matrix

| Class group | Card lifecycle | Combat resource | Run resource |
| --- | --- | --- | --- |
| Adventurer, Knight, Rogue, Mage, Berserker, Seer, Imp, Martial Artist, Vampire, Ghost Swordsman | Standard physical five-card cycle | Knight charge, Mage mana, Seer Revelation, Martial combo, Vampire Thrall, Ghost Slash readiness | Ghost Swordsman Devour and Ghost Slash level |
| Gunslinger | Three physical cards, Full Burst consumes remaining hand and resets when exhausted | Full Burst readiness/cycle cooldown | None |
| Twins | Four physical cards with alternating parity; Acrobatics resets hand/cycle | Parity and Acrobatics readiness | None |
| Gambler | Eleven-card draw pile; two-card hand; discard/reshuffle; used 6/7 vanish; no normal cycle | None | Entire deck, hand, discard, vanished and unlock progress |

All standard physical card IDs persist across normal cycle resets and card recovery. Shop replacement intentionally creates a new card ID. Gambler unlock intentionally creates a new physical card ID. The active Ghost Swordsman transformation augment temporarily replaces its physical pool and restores the original one according to the locked T02 contract.

## Duplicate-class policy

- Two Imps: deterministic shared pre-steal snapshot and seat-order resolution, reused from the competitive engine.
- Two Vampires: existing seat-order sequential swaps; each has its own Thrall mark.
- Two Seers: independent Revelation and private peek state.
- Two Knights: each activated Knight card can pass collision; other same-number cards still follow the existing collision result. This matches the competitive Toughness handler.
- Lobby selection has no uniqueness restriction.

## Remaining contract conflict

`AMB-CLASS-BERSERKER-HEAL-CAP`: CONTENT-004 says collision heal may reach the class base maximum HP. The existing base engine caps a non-augmented Berserker at HP 2, and changing that cap altered the immutable T02 golden fingerprint. The change was reverted. The project needs an explicit canonical decision before this class can be called COMPLETE under CONTENT-004. The `aug-131` exception still heals up to max HP.

## Verification scope

The prior Floor 1–3 and settlement suites, fixed T00/T02/T03/T04/T05/T06/T09 fixtures, and Project Checks are run on each PR HEAD. See the PR checks for the final counts and result. No production deployment was made.

Class balance was not tuned. `BALANCE_WARNING_CLASS_*` is not asserted from these wiring fixtures because controlled HP and monster HP invalidate win-rate and damage-balance conclusions.
