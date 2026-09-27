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

- each T00 seed deterministically rotates the four reference classes across lobby seats, and negotiation uses a deterministic seed-rotated lobby order; slot fairness is therefore measured separately from class behavior
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
| T05 Number Mutation | ACTIVE | Mage Reverse Math + Vampire/Full Thrall + Imp/Bold Steal + Knight executable |
| T09 Resource Starvation | ACTIVE | Knight/Mage/Prophet/Gunner basic resource capabilities + starvation policy executable |
| T02 Burst Ceiling | SKIP | Demon Swordsman / Martial Artist engines and required burst build effects unavailable |
| T03 Sustain Fortress | SKIP | Warrior `수호벽`, Vampire `수혈`, Mage `백마도사` runtime effects unavailable |
| T04 Collision Farm | ACTIVE | Knight/Imp/Berserker/Vampire base engines, four Tier-I builds, farm/safe policies executable |
| T06 Recovery Loop | SKIP | Prophet / Demon Swordsman PVE engines and required build effects unavailable |

Availability is computed from runtime definitions. The generated SKIP report is authoritative.

## T05 Number Mutation

T05 is ACTIVE with:

- Mage / `역산술` (`aug-111`)
- Vampire / `완전한 권속` (`aug-301`)
- Imp / `대담한 슬쩍` (`aug-181`)
- Knight / `불굴의 기사` (`aug-031`)

The authoritative mutation order is explicit code, not an accidental effect-priority ordering:

```text
BASE_NUMBER
→ SELF_MODIFY
→ PRE_COLLISION_SWAP
→ PRE_COLLISION_STEAL
→ FINAL_NUMBER
→ COLLISION_GROUP
→ COLLISION_RESOLUTION
→ VALIDITY
→ DAMAGE
```

### Tier-I BETA rules used

**Reverse Math**
- Mana 2 => ±1
- Mana 4 => ±2
- result must be an integer in 0..6
- direction and Mana spend are fixed in `skill_data` before resolve.

**Vampire base / Full Thrall**
- base deck 1/2/3/4/5
- a collision creates a Thrall mark when none exists: highest growth EXP, seat order tie-break
- Blood Command swaps numeric working values after SELF_MODIFY; physical cards and cycle ownership never move
- Full Thrall limits Blood Command to once per cycle
- valid Blood Command earns Dominance +1, cap 2
- a later valid Blood Command consumes existing Dominance for +1 damage per stack; the current success can then establish the next Dominance stack.

**Imp base / Bold Steal**
- base deck 1/2/3/4/5
- in PRE_COLLISION_STEAL, each matching non-Imp loses up to 1, never below 0
- Imp gains exactly the sum actually removed
- if at least two players are successfully stolen from in the same turn, Bold Steal grants +2 damage once for that attack
- the damage bonus does not rerun STEAL.

### Number-history telemetry

Debug/stress turn results retain for every submitted physical card:

```json
{
  "playerId": "p1",
  "cardInstanceId": "card-123",
  "baseNumber": 3,
  "selfModifiedNumber": 4,
  "postSwapNumber": 5,
  "postStealNumber": 4,
  "finalNumber": 4,
  "collisionGroup": ["p1", "p3"],
  "collisionImmune": false,
  "valid": false,
  "damage": 0
}
```

Mutation events are also ordered and stored with their phase, effect id, actor/target, and before/after values.

These debug structures are removed by `projectRun()`: ordinary PlayerView does not receive `numberHistories`, `mutationEvents`, or embedded per-card mutation debug state.

Artifacts:
- `pve_number_mutation_turns.jsonl`
- `pve_t05_fixtures.json`
- `tests/fixtures/pve-stress-t05-golden.json`

### T05 hard invariants

- NUMBER-01: all history numbers are finite integers
- NUMBER-02: `history.finalNumber === resolved.finalNumber`
- NUMBER-03: damage packets identify the same `finalNumber` as their `numberUsed`
- NUMBER-04: swap never moves physical card ownership
- NUMBER-05: Imp gain equals the sum actually removed from victims
- NUMBER-06: victim values never fall below 0
- NUMBER-07: a mutation effect cannot accidentally execute twice in the same phase/actor/target slot
- NUMBER-08: mutation event phase order cannot move backwards or re-enter PRE_COLLISION after finalization

T05 also keeps all existing card-zone, hidden-information, resource and deterministic replay hard failures.

### Fixtures

The semantic golden contains F1-F8 required chain fixtures plus:
- F9 Reverse Math -1
- F10 steal minimum boundary at 0
- F11 Bold Steal two-target +2 damage
- F12 Full Thrall existing-Dominance damage consumption

### Known ambiguity

`AMB-T05-MULTI-IMP`: the current BETA rules do not define ordering for multiple simultaneous Imps. T05 contains exactly one Imp. The resolver rejects that undefined case instead of inventing an ordering rule.

## T04 Collision Farm

T04 is ACTIVE with:

- Knight / `압살 기사` (`aug-051`)
- Imp / `대담한 슬쩍` (`aug-181`)
- Berserker / `불사 투사` (`aug-131`)
- Vampire / `완전한 권속` (`aug-301`)

The existing T05 number mutation order is unchanged. T04 adds exactly one semantic stage after the final collision result:

```text
BASE_NUMBER
→ SELF_MODIFY
→ PRE_COLLISION_SWAP
→ PRE_COLLISION_STEAL
→ FINAL_NUMBER
→ COLLISION_GROUP
→ COLLISION_RESOLUTION
→ POST_COLLISION_EFFECTS
→ VALIDITY
→ DAMAGE
```

`POST_COLLISION_EFFECTS` does not call collision grouping or resolution. Every collision group receives a stable `collisionEventId`, and a second attempt to process the same identifier fails with `COLLISION_REWARD_REENTRY` before any reward mutation.

### BETA values used

**Berserker base**
- deck: 1 / 2 / 4 / 4 / 5
- every valid monster attack: final number +1 damage
- after a valid attack, pay 1 HP without going below HP 1
- final collision invalidation heals 1, with base healing cap HP 2

**Crush Knight**
- only a Toughness-immune Knight in an actual final collision can Crush
- `crushedCardCount` counts distinct other physical cards whose final invalid reason is that collision
- +1 damage per crushed card
- maximum Crush bonus +2 per turn

**Immortal Fighter**
- collision healing cap expands from base HP 2 to max HP
- actual DIRECT monster damage gains Revenge +1, max 1
- the next valid attack consumes Revenge exactly once for +2 damage
- blocked-to-zero damage, self HP cost, collision and other self-damage paths do not generate Revenge

Revenge is registered in `PVE_RESOURCE_DEFS` with `resetScope: COMBAT`.

### Collision telemetry

Each final collision group records:

- `collisionEventId`
- final number and member player IDs
- invalidated and immune player IDs
- crushed physical card IDs / `crushedCardCount`
- Berserker collision healing
- Imp amount stolen before that final collision
- relevant Vampire swap count
- Knight Crush bonus damage
- collision-generated resources
- immediate damage/healing value
- post-collision effect trigger count
- recursive collision trigger count

The T04 scenario summary aggregates collision groups, intentional attempts/successes, invalidated cards, Crush counts/damage, Berserker healing and Revenge gain/consume, Imp stolen amount, Vampire swaps, generated resource value and per-collision averages.

### Farm and Safe policies

`COLLISION_FARM` and `SAFE_PLAY` use only each player's owner PlayerView plus voluntarily shared available numbers / intended collision numbers / skill intent.

- Farm chooses a deterministic shared number and prioritizes Knight + Berserker collision opportunities.
- It does not force all four players onto one number every turn; when all four can collide, deterministic turns can peel one non-core participant away.
- Safe Play greedily avoids duplicate base numbers when possible and does not intentionally activate Toughness or Blood Command for collision creation.
- Neither policy reads authoritative private hand/card-instance state belonging to another player.

For the same seed, party and encounter, T04 executes both policies. `FARM_DOMINATES` is only a BALANCE_WARNING when Farm DPT is at least 1.35× Safe DPT while final party HP and Flame are both no worse. The threshold does not change game balance.

### T04 hard invariants

- collision grouping/resolution and POST_COLLISION_EFFECTS each execute exactly once per turn
- duplicate `collisionEventId` reward processing is a hard failure
- Berserker heals at most once per collision group
- a physical card can be counted as crushed at most once
- only finally `COLLISION`-invalid cards are crushed
- Knight's own card is never crushed
- final-number members must exactly match collision-group inputs
- Imp steal conservation remains enforced by T05 invariants
- Revenge gain/consume cannot recurse
- HP/resource/card-zone/hidden-information invariants remain active
- deterministic replay must reproduce the complete collision timeline

### T04 synthetic fixtures

1. Berserker base valid attack.
2. Berserker self-HP floor.
3. Berserker base collision heal.
4. Immortal Fighter max-HP collision heal.
5. Revenge gain from actual DIRECT damage.
6. Revenge consume on the next valid attack.
7. self attack HP cost does not create Revenge.
8. one-card Knight Crush.
9. multi-card Knight Crush.
10. Toughness with no final collision.
11. Imp steal removes an intended base collision.
12. Vampire swap creates a final collision.
13. full mixed swap + steal + Toughness + Berserker heal + Crush ordering.
14. duplicate collision-event re-entry rejection.

Artifacts:
- `pve_collision_farm_turns.jsonl`
- `pve_collision_safe_turns.jsonl`
- `pve_t04_fixtures.json`
- `tests/fixtures/pve-stress-t04-golden.json` after the semantic golden is locked.

## T09 Resource Starvation

T09 is ACTIVE with the base-character party:

- Knight — Toughness
- Mage — Mana / basic Amplify
- Prophet — Revelation / deterministic spent-card recovery / private reveal
- Gunner — 1/2/3 cycle / base Full Burst

No Tier-I build is required for T09.

### Resource contract

- Mana: combat start 0, turn start +1, base max 4.
- Toughness: existing base charge/cycle rules and base max are reused.
- Revelation: combat resource, base max 1. Prophet collision gains 1 up to cap.
- Full Burst: existing base readiness/cycle state is reused.

Invalid resource requests are rejected during validation before committed card/resource mutation. Structured rejection codes used by T09 include:

- `INSUFFICIENT_RESOURCE`
- `SKILL_NOT_READY`
- `INVALID_PHASE`
- `ALREADY_USED`
- `INVALID_SKILL_REQUEST`

A rejected request must leave resource, card zones, current committed submission and deterministic RNG state unchanged.

### Prophet Revelation

Revelation is an immediate pre-submit skill. It can be used while selection is open and the Prophet has not committed a card. No card-submit cancellation path is required.

On use:

1. spend Revelation 1,
2. privately reveal one eligible READY teammate's submitted card number,
3. deterministically choose one physical card from the Prophet's current-cycle spent zone,
4. move that same card instance from spent to remaining.

If the current cycle has no spent recovery candidate, the reveal still succeeds and Revelation is spent; recovery is a no-op.

If the Prophet's subsequently submitted card collides in the same turn, collision resolution can regain Revelation:

`1 → use → 0 → collision → 1`.

The private reveal is stored only in the Prophet's private combat projection and is cleared on the next turn/combat end. Raw `turnSubmissions`, target remaining cards and target spent cards are never exposed.

### Resource starvation policy

The T09 policy is intentionally non-optimal:

- plays low remaining numbers to drive cycles toward exhaustion,
- spends Knight Toughness whenever available,
- spends Mage Mana at 2 as soon as possible,
- spends Revelation as soon as an eligible READY reveal exists,
- attempts base Full Burst whenever ready,
- injects invalid probes at resource/readiness boundaries,
- follows every rejected request with normal legal play.

All policy decisions are made from owner PlayerView plus public READY information.

### T09 hard invariants

- Mana, Toughness and Revelation never become negative.
- resource values never exceed their current registry-defined cap.
- rejected requests cannot consume resource or mutate card/submission state.
- normal card resubmission during `SELECTION_OPEN` preserves the existing latest-submission-authoritative rule and cannot double-spend resource; an immediate Prophet skill attempted after the Prophet has committed a card rejects with `ALREADY_USED`.
- remaining + spent is an exact partition of existing physical card IDs.
- recovery moves an existing card ID and never creates a new instance.
- an active empty hand cannot persist without cycle reset.
- Full Burst success consumes follow-ups once and resets the cycle once.
- Full Burst collision failure consumes no follow-up cards.
- combat-scoped resource entries do not survive COMBAT_END.
- same-seed resource timeline must be identical.

### T09 synthetic fixtures

1. Mage Mana 0 illegal 2-cost cast.
2. Mage exact Mana 2 cost.
3. Knight Toughness 0 illegal activation.
4. Prophet collision gain 0→1.
5. Prophet max collision remains 1.
6. Prophet use + deterministic physical-card recovery.
7. Prophet use + same-turn collision regain.
8. Prophet use with no recovery candidate.
9. Gunner final card cycle reset.
10. Full Burst success.
11. Full Burst collision failure.
12. repeated invalid resource requests.

Generated artifacts include:

- `pve_resource_starvation_turns.jsonl`
- `pve_t09_fixtures.json`
- `tests/fixtures/pve-stress-t09-golden.json` once the semantic golden is locked.

### T09 known ambiguity

`AMB-T09-SEER-PEEK-TARGET`: PVE combat disallows direct teammate targeting, but the current base Prophet text does not define a class-specific priority when multiple teammates are already READY. The executable path uses the existing stable automatic-target convention — first eligible READY teammate by lobby seat. Reveal scope/resource semantics are fixed independently of this future content-rule choice.

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

## Effect Engine additions used by T00/T05

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
- `pve_number_mutation_turns.jsonl` when T05 runs
- `pve_t05_fixtures.json` when T05 runs
- `pve_resource_starvation_turns.jsonl` when T09 runs
- `pve_t09_fixtures.json` when T09 runs
- `pve_collision_farm_turns.jsonl` when T04 runs
- `pve_collision_safe_turns.jsonl` when T04 runs
- `pve_t04_fixtures.json` when T04 runs
- `scenarios/<scenarioId>.csv`

GitHub Actions uploads the whole directory as `pve-stress-smoke-<sha>`.

Resolved RULE-01~05 are written to `pve_canonical_rules.json`; `pve_spec_ambiguities.json` is reserved for genuinely unresolved issues discovered later.

No production HP / EXP / Gold / Flame / monster balance numbers are changed by the T00/T04/T05/T09 stress work. T04 only adds the canonical Berserker deck/ability and existing BETA Tier-I augment values needed to make the scenario executable.


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
- yield rate, where only an actual `YIELD_TO_AVOID_COLLISION` concession counts as a yield; Rogue solo-lowest attempts and Mage number adjustments remain negotiation changes but are not mislabeled as concessions
- actual collision rate
- valid attack rate
- average available number count

For a 100-seed T00 balance run, policy-fairness BALANCE_WARNINGs are added when:

- one lobby slot's yield rate is at least 2x another slot's
- for the exact same `availableNumbers` set, one character's actual collision rate is at least 2x another character's
- a character's average damage share is below 5%

These are bot-policy review warnings, not automatic game-balance changes.

## CI reference baseline

Project Checks run:

```bash
npm run pve:stress:smoke
npm run pve:stress:balance -- --scenario T00 --output artifacts/pve-stress-balance
npm run pve:stress:balance -- --scenario T05 --output artifacts/pve-stress-t05-balance
npm run pve:stress:balance -- --scenario T09 --output artifacts/pve-stress-t09-balance
npm run pve:stress:balance -- --scenario T04 --output artifacts/pve-stress-t04-balance
```

T00, T04, T05 and T09 100-seed sweeps are uploaded separately. Neither balance sweep changes production combat values or warning thresholds.
