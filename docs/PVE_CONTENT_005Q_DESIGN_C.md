# PVE CONTENT-005Q-DESIGN-C — Seer / Imp / Gambler / Gunslinger runtime-ready contract

Baseline: `4d7a5f46391234f36d82d1d992090946fdfd802e`  
Branch: `feat/pve-content-005q-design-c`  
Scope: `aug-151..270` (120 stable IDs). Design-only overlay: no runtime handler, no candidate executable transition, no production Supabase mutation, no BETA v0.1 edit.

## Methodology
Source precedence: explicit 005Q user decisions → 005Q overlays → 005R resolved contract → immutable BETA v0.1 → canonical class mechanics → existing runtime reference. Conservative completions are tagged `BETA_V02_INFERRED`.

Preflight for these 120 rows was 10 SPEC_COMPLETE / 54 SPEC_PARTIAL / 56 SPEC_AMBIGUOUS. DESIGN-C resolves them to **120 SPEC_COMPLETE / 120 RUNTIME_READY / 0 blocked** without runtime implementation.

## Base canonical
### Seer
1/2/3/4/5. Revelation max 3. Usable during SELECTION_OPEN until confirmed submit, including after local selection. Spend 1; recover one own same physical current-cycle SPENT card to REMAINING; selected/submitted cards excluded. Activation-turn valid/pass gains +1 Revelation; collision gains 0. Explicit READY inspection is OWNER_ONLY. Existing collision→max1 runtime is a documented mismatch, not source-of-truth.

### Imp
BASE_NUMBER → SELF_MODIFY → PRE_COLLISION_SWAP → PRE_COLLISION_STEAL → FINAL_NUMBER → COLLISION. Victim floor 0; gain actual stolen amount. Multiple Imps resolve seat then playerId; later Imp sees prior mutation. No recursive steal replay.

### Gambler
DECK/HAND/DISCARD/VANISHED are distinct physical zones. Base deck 1–5×2 + 6; draw 2 with seeded RNG; used 6/7 vanish; exact zones owner-private/server-only; shop replacement forbidden; `usesStandardCycle=false`.

### Gunslinger
Magazine 1/2/3. Full Burst phases: activation → selected resolution → success/failure → remaining uses → cycle advance → cooldown. Current runtime reference: success next-ready cycle+2, collision failure cycle+1, misfire self-damage 1 can DOWN.

## High-risk
- aug-151
- aug-161
- aug-171
- aug-181
- aug-201
- aug-211
- aug-221
- aug-231
- aug-241
- aug-251
- aug-257
- aug-261

aug-201 protection/heal is before DOWN_RESOLVE and never revives already-DOWNED. aug-211 Luck is after Reward presentation and before final confirm. aug-231 All-In uses one judgment card for collision and SET_DAMAGE to two-card sum on valid. aug-241 is a 1/2/2/3 four-card magazine override. aug-257 preserves enemy-defense penetration identity. aug-261 Overheat is reconnect-safe 0..3.

## Coverage
- Seer/Imp/Gambler/Gunslinger = 30 each.
- 12 archetypes ×10; each class Stage1/2/3/4 = 3/9/9/9.
- 120/120 room, once, reset, persistence, visibility, reconnect, idempotency and test contracts.
- `runtimeReady=true` is design metadata; all cards explicitly keep `executable=false`.

## Dependencies
- 1. Seer visibility + physical recovery provenance
- 2. Imp deterministic PRE_COLLISION_STEAL + chain guard
- 3. Gambler owner-private zone adapter + deterministic draw modifiers
- 4. Gambler All-In atomic multi-card resolution
- 5. Gunslinger magazine adapter
- 6. Full Burst derived physical-card uses + cooldown hooks
- 7. Overheat adapter/order
- 8. card-specific handlers by 005C-A/B/C/D

## Primitive inventory
- Already available: GAIN_RESOURCE, RECOVER_CARD, ADD_DAMAGE, DELAY_EFFECT, ADD_STACK, MODIFY_RESOURCE_CAP, REVEAL_PRIVATE_INFO, MODIFY_NUMBER, SPEND_RESOURCE, MODIFY_INCOMING_DAMAGE, APPLY_STATUS, DRAW_CARD, MODIFY_DECK, MOVE_CARD_ZONE, SET_DAMAGE, SET_RESOURCE
- Needs extension: RECOVERED_CARD_PROVENANCE, ALLY_RECOVERY_SELECTOR, PREDICTION_STATE, DOWN_RESOLVE_WINDOW, REWARD_PRE_CONFIRM_HOOK, OWNER_PRIVATE_DECK_PROJECTION, ALL_IN_RESOLUTION, MAGAZINE_ADAPTER, PRECISION_SHOT_PREDICATE, OVERHEAT_ADAPTER, FULL_BURST_ORDERING
- Genuinely new: BASE_RULE_OVERRIDE, RECOVER_CARD_SELECTOR, MODIFY_EXP, PHYSICAL_CARD_IDENTITY, MODIFY_DAMAGE, OVERRIDE_BASE_RULE, HEAL, ROOT_ACTION_GUARD, DAMAGE_SELF, FULL_BURST, MODIFY_FULL_BURST

## Cross-class
- **Seer recovery × Gambler special zones** — Generic SPENT recovery never moves Gambler 6/7 from VANISHED; Gambler uses zone-specific eligibility.
- **Imp PRE_COLLISION_STEAL × Mage SELF_MODIFY** — Mage SELF_MODIFY completes first; Imp sees post-self-modify/pre-steal numbers.
- **Imp steal × Knight collision override** — Steal determines FINAL_NUMBER/collision first; Knight override acts afterward without rerunning steal.
- **Gambler All-In × collision** — Only judgment card number enters collision; partner card creates no second collision group.
- **Gunslinger Full Burst × Imp steal** — Activation selected card uses normal steal/collision; derived remaining-card uses do not reopen same-turn PRE_COLLISION_STEAL.
- **Gunslinger Full Burst × Rogue soloLowest** — Derived uses retain own attribution and do not inherit Rogue-only soloLowest semantics.

## Runtime batches
005C-A Seer → 005C-B Imp → 005C-C Gambler → 005C-D Gunslinger → 005C-FINAL.

## Unresolved questions
No DESIGN_BLOCKER remains. Inferred decisions are provenance-labelled rather than silently presented as source-explicit.

## Balance
`BALANCE_WARNING_DESIGN_C`: inferred thresholds/values require runtime-batch validation; this phase does not tune runtime or stress goldens.

## Acceptance
SPEC_COMPLETE=120, SPEC_PARTIAL=0, SPEC_AMBIGUOUS=0, RUNTIME_READY=120, RUNTIME_BLOCKED=0. Runtime implementation=0. Production unchanged. BETA v0.1 unchanged. Stable IDs unchanged.

**READY_FOR_PVE_CONTENT_005C_A_SEER = true**  
**READY_FOR_PVE_CONTENT_005C_RUNTIME = true**
