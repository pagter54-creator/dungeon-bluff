# PVE deterministic stress test harness

Source specification: `눈치레이드_PVE_극단조합_자동테스트_v1.md`.

The harness runs the authoritative PVE rule engine directly. It does not use browser UI, animation, or client timers.

## Commands

```bash
# PR smoke: 10 deterministic seeds per available scenario
npm run pve:stress:smoke

# Balance sweep: 100 deterministic seeds per available scenario
npm run pve:stress:balance

# Pre-BETA stress: 500 deterministic seeds per available scenario
npm run pve:stress:full

# Replay one failed seed exactly
npm run pve:stress -- --scenario T00 --seed "smoke:T00:0000"
npm run pve:stress -- --scenario T14 --seed "smoke:T14:0000"

# Custom count/output
npm run pve:stress -- --mode balance --count 25 --output artifacts/pve-stress
```

## Cooperation levels and information boundary

The stress harness distinguishes cooperation level from character balance.

| Scenario | Cooperation model | Information allowed |
|---|---|---|
| T12 No Communication | no hand/intent sharing | each bot uses only its own PlayerView and public state |
| T00 Reference Communication | ordinary human-like chat/voice coordination | each bot may voluntarily broadcast information derived from its own PlayerView |
| T13 Perfect Coordination | theoretical coordination ceiling | privileged/authoritative hidden state is allowed only here |

T12 and T13 are not activated by this policy task.

T00 never receives authoritative `privateByPlayer`, another player's physical card ids, raw `turnSubmissions`, future RNG/draw state, or hidden monster state. Each bot first receives only `projectRun(run, playerId)`; the harness calls `buildReferenceIntent(view, playerId)` separately for each owner. The negotiation step receives only the resulting broadcast objects, never the authoritative run.

T13 Perfect Coordination remains separate and unimplemented. T00 does not reuse a privileged planner.

## Canonical rules

### RULE-01 — Boss kill + full wipe

If the same resolve produces all three of the following:

- Boss HP <= 0
- zero surviving players after DOWN resolution
- Flame = 0

then `RUN_FAILED` wins before boss-clear revival, rewards, or room/floor clear.

The current engine already resolved this way; the behavior is now canonical and locked by T14-5.

### RULE-02 — lethal damage + immediate heal/protection

Lethal HP is provisional until `DOWN_RESOLVE`.

1. Damage may place a player in `pendingDownPlayerIds`.
2. immediate damage-triggered heal/protection/rescue effects run first.
3. if HP is back to >= 1 before `DOWN_RESOLVE`, pending DOWN is cancelled.
4. after all immediate effects, HP <= 0 becomes DOWNED/rescued by Flame according to normal rules.
5. a heal that happens after DOWN resolution does not undo the already-finalized DOWNED status.

`pendingDownPlayerIds` is server-private and is stripped from PlayerView.

T14-6 locks the current `PLAYER_DAMAGED -> immediate heal -> DOWN_RESOLVE` ordering.

### RULE-03 — executable vs metadata-only augments

The 390-card catalog may contain selection metadata without runtime effects. That is valid.

Only augments with executable `effects` count as executable to stress-scenario availability.

Current intentionally executable Tier-I T00 builds:

- Adventurer / 노련한 탐험가 — `aug-001`
- Knight / 불굴의 기사 — `aug-031`
- Rogue / 비열한 일격 — `aug-061`
- Mage / 대마도 증폭 — `aug-091`

All other augment metadata remains metadata-only unless explicitly implemented later.

### RULE-04 — DOWNED and STUNNED_NEXT_TURN

These are different states.

- `DOWNED` = **쓰러짐**: finalized HP-0 state, cannot act or submit cards, participates in Flame/revival rules.
- `STUNNED_NEXT_TURN` = **기절**: still alive; next turn cannot choose directly and follows the server stun auto-submit rule.

Do not use the two terms interchangeably in code, tests, or UI-facing text.

### RULE-05 — combat-only resource lifecycle

Resources declare reset scope through the centralized PVE resource registry.

Current scopes use:

`TURN | CYCLE | COMBAT | FLOOR | RUN`

For `resetScope: COMBAT` resources:

- clear explicitly at `COMBAT_END`
- defensively clear/reinitialize again at the next `COMBAT_START`

Run-persistent state is not cleared: HP, runGold, card-pool replacements, engravings, relics, augments, growth EXP, and explicitly run-persistent class resources.

The current registry covers implemented combat resources plus reserved names for future combat-only revelation/combo/poison/break/prank/heat state. Future resources should be registered by scope instead of adding scattered combat-end cleanup branches.

## T00 Reference

T00 is ACTIVE.

Party:

- Adventurer — 노련한 탐험가
- Knight — 불굴의 기사
- Mage — 대마도 증폭
- Rogue — 비열한 일격

T00 uses ordinary PlayerView-only bots, not privileged coordination.

Reference bot behavior models a basic communicating four-player party rather than four isolated greedy bots.

### Intent Broadcast

Each active bot builds a broadcast from its own PlayerView:

- `playerId`
- `availableNumbers`: unique numbers from that owner's current remaining physical cards
- `preferredNumbers`: simple local ranking
- `initialChoice`
- voluntary class/resource signals needed for ordinary coordination, such as Toughness availability or the Mage's currently available adjustment

No physical card id is broadcast.

### Deterministic limited negotiation

Negotiation receives only the broadcasts.

- lobby order is used with a deterministic seed-based rotation so the same fixed seat is not always forced to yield
- a bot that clashes may inspect at most two alternate preferences
- there is one negotiation pass; no backtracking, permutation search, Cartesian search, or global optimal assignment
- unresolved collisions are legal and remain in the result
- the Mage may use its currently available +1/+2/+3 adjustment when that resolves an announced clash
- the Knight uses Toughness penetration only when limited normal concession cannot resolve the clash and the lost-card-value difference is material
- the Rogue may change to an announced unique-lowest attempt after hearing team intents, but falls back to ordinary high-value play when that opportunity is not present
- Adventurer remains high-card oriented; veteran streak does not grant access to any extra hidden information

The chosen physical card is resolved afterwards from that player's own PlayerView only.

The stress runner executes deterministic F1 Normal / Elite / Boss reference encounters and records:

- turns / party DPT
- per-character damage and share
- HP damage / healing / Flame spent / EXP gain
- successful effect trigger counts
- intent conflicts before and after negotiation
- negotiation changes and reasons
- per-player/per-character yield, collision and valid-attack rates

### T00 class rules implemented

**Adventurer**
- deck 1/2/3/4/5
- valid monster hit: +1 growth EXP
- positive run-gold reward: +1 extra G

**Knight**
- deck 2/3/4/5/5
- Toughness starts at current base rule
- cycle start +1, capped by current resource maximum
- spending Toughness grants collision immunity for that card
- same-number ordinary cards remain invalid

**Mage**
- deck 1/2/3/4/4
- base max Mana 4, start 0, turn start +1
- 2 Mana => final number +1
- 4 Mana => final number +2
- number modification occurs before collision

**Rogue**
- deck 1/1/3/4/5
- if Rogue is the unique lowest valid card after collision resolution, base combat damage is set to 5
- invalid/shared-lowest cards do not qualify

### T00 Tier-I executable augments

**노련한 탐험가**
- successful valid hits build `veteranStreak`
- collision resets the streak
- from the second consecutive valid hit onward, that attack gains +1 damage
- combat-scoped

**불굴의 기사**
- Toughness cap becomes 3
- actual collision penetration grants non-stacking `unyielding`
- the next DIRECT damage is reduced by 1 and consumes `unyielding`

**대마도 증폭**
- Mana cap becomes 6
- 2/4/6 Mana => +1/+2/+3 final number
- modified final number is used by collision and damage

**비열한 일격**
- solo-lowest valid success stores Sneakiness for the next qualifying hit
- previous `sneakyStack` contributes +1 damage per stack to the next solo-lowest hit
- collision or failure to be unique-lowest resets the chain
- BETA stack cap is 2

The four definitions use the shared effect structure: trigger, condition, operations, resetScope, priority and generic resource/damage operations. No 390-card character-specific giant switch was introduced.

## Current scenario activation

| Scenario | State | Reason when skipped |
|---|---|---|
| T00 Reference | ACTIVE | four required classes/build effects executable |
| T14 Flame Boundary | ACTIVE | six canonical boundary fixtures |
| T05 Number Mutation | SKIP | Vampire and Imp PVE engines/build effects unavailable; 역산술 remains metadata-only |
| T09 Resource Starvation | SKIP | Prophet PVE engine unavailable |
| T02 Burst Ceiling | SKIP | Demon Swordsman / Martial Artist / Berserker PVE engines and required build effects unavailable |
| T03 Sustain Fortress | SKIP | Vampire / Berserker PVE engines and required build effects unavailable |
| T04 Collision Farm | SKIP | Imp / Berserker / Vampire PVE engines and required build effects unavailable |
| T06 Recovery Loop | SKIP | Prophet / Demon Swordsman PVE engines and required build effects unavailable |

Availability is computed from runtime definitions. The generated SKIP report is authoritative.

## T14 fixtures

T14 retains six fixtures:

1. Flame 1 + one lethal hit
2. Flame 1 + two simultaneous lethal hits
3. Flame 0 + one survivor / three DOWNED, including successful next-turn progression
4. Flame 0 + four simultaneous lethal hits
5. boss kill + full-party wipe in the same resolve => RUN_FAILED
6. lethal damage + immediate healing in the same resolve => heal is applied before DOWN_RESOLVE

Golden fixture:

`tests/fixtures/pve-stress-t14-golden.json`

RULE-01 and RULE-02 formalize the existing golden behavior; the expected outcomes are not loosened to make the tests pass.

## Effect Engine additions used by T00

The existing Effect Engine remains the shared execution path.

Generic operations added for T00:

- `SET_RESOURCE`
- `SET_RESOURCE_MAX`
- `CAPTURE_RESOURCE`
- `MODIFY_INCOMING_DAMAGE`
- existing `ADD_RESOURCE` now respects declared/current resource max
- existing `MODIFY_DAMAGE` supports `amountPath` for context-derived numeric values

Additional trigger used:

- `BEFORE_PLAYER_DAMAGE`

These operations are generic and reusable by future augments/relics.

## Result levels

- `FAIL`: invariant/rule-engine failure. CI exits non-zero.
- `BALANCE_WARNING`: numeric signal only. CI remains green.
- `PASS`: no hard failure and no warning.
- `SKIP`: required character/build/content is not executable. No substitution occurs.

Hard failures cover:

- non-deterministic same-seed replay
- softlock / turn or action ceiling
- hidden PlayerView state / raw submission leak
- duplicate physical card instance across zones
- zone references to missing cards
- invalid HP / Flame / gold / EXP / class resources
- resource-cap violations
- DOWNED player submission
- combat-only resource leakage after COMBAT_END
- impossible selected-card zone state

## Generated files

Default: `artifacts/pve-stress/`

- `pve_stress_summary.json`
- `pve_failed_seeds.json`
- `pve_stress_seeds.csv`
- `pve_skipped_scenarios.json`
- `pve_spec_ambiguities.json`
- `pve_canonical_rules.json`
- `pve_reference_turns.jsonl` when T00 runs
- `scenarios/<scenarioId>.csv`

GitHub Actions uploads the whole directory as `pve-stress-smoke-<sha>`.

Resolved RULE-01~05 are written to `pve_canonical_rules.json`; `pve_spec_ambiguities.json` is reserved for genuinely unresolved issues discovered later.

No production HP / EXP / Gold / monster balance numbers are changed by this stress/T00 task.


## T00 reference telemetry and fairness review

Each T00 negotiated turn records, per participating player:

- `availableNumbers`
- `preferredNumbers`
- `initialChoice`
- `finalChoice`
- `negotiationChanged`
- `changeReason`
- `skillIntent`
- `collisionExpectedBeforeNegotiation`
- `collisionExpectedAfterNegotiation`
- `actualCollision`
- `actualCollisionInvalidated`
- `validAttack`
- actual damage contributed by that turn

The aggregate report includes:

- `totalIntentConflicts`
- `resolvedIntentConflicts`
- `unresolvedIntentConflicts`
- `negotiationChangeCount`
- collision rates before/after negotiation
- negotiation resolution rate
- per-player and per-character first-choice keep rate
- yield rate
- actual collision rate
- valid attack rate
- average available number count

For a 100-seed T00 balance run, policy-fairness BALANCE_WARNINGs are added when:

- one lobby slot's yield rate is at least 2x another slot's
- for the same available-number-count bucket, one character's actual collision rate is at least 2x another character's
- a character's average damage share is below 5%

These are bot-policy review warnings, not automatic game-balance changes.

## CI reference baseline

Project Checks run both:

```bash
npm run pve:stress:smoke
npm run pve:stress:balance -- --scenario T00 --output artifacts/pve-stress-balance
```

The 100-seed T00 balance sweep is uploaded separately so reference-policy regressions can be compared without changing production combat values.
