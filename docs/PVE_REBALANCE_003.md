# PVE REBALANCE 003 — Wisp / Echo targeted rework

## Provenance and scope

Built on PR34 cumulative HEAD `d5428b490b96033080e1cd004e790370c08d5b7a` (Project Checks #989 success). Branch `feat/pve-rebalance-003-wisp-echo`. PR33/34 integration is retained; no main merge or production deployment.

Only F2_FLAME target selection and ECHO stack gain/decay change gameplay. All 36 monster HP, mechanic values and pattern templates are unchanged. A differential audit verified identical state, events and actions for the other 34 monsters through eight scripted turns each. All other PVE runtime files are byte-identical to PR34, including pool fallback, adaptive requirements, cadence +1, EXP thresholds 30/100/250/500 and Blood Frenzy ordering.

Baseline suite: **2,481 pass / 0 fail**. Candidate suite: **2,499 pass / 0 fail** (+18 focused tests). Static check: **258 JS/TS files PASS**. Exact final GitHub HEAD, Draft PR and CI are recorded in the PR and spreadsheet after publication.

Supabase calls 0; production mutation 0; no migrations, browser, AI policy changes or additional balance changes.

## Exact before / after behavior

### 늪불 등불지기 — f2_wisp_lamplighter

Before: odd turns LOW (`finalNumber >= 4`), even turns HIGH (`finalNumber <= 3`). Every dangerous submitted card appended its player to pendingHits, regardless of validity; each pending target received DIRECT pattern damage 1 after player damage, unless the monster was already killed. Standard DIRECT/AOE monster actions were separate.

After: same mode timing, danger predicates and damage type/amount. LOW picks highest dangerous finalNumber; HIGH picks lowest. Ties use earliest seat then playerId. At most one pending target; no random draw. DOWNED players are excluded. Collision-invalid dangerous submissions remain eligible. Base monster action damage remains separate and can add damage in the same turn.

`wisp-flame.js` shares the predicate, target ordering and cue with server presentation. LOW cue: “낮은 불꽃 · 4~6 위험 · 최고 위험 숫자 1명 피해 1”; HIGH cue uses 1~3 / lowest. Threshold predicates remain exactly >=4 / <=3, including any existing out-of-range final-number semantics; this PR does not introduce clamping.

Authoritative `WISP_FLAME_TARGETED` records mode, range, candidates, selected player/number and scheduled amount. Actual PLAYER_DAMAGED events are tagged `monsterPatternSource=F2_FLAME`, preserving reductions/redirects and actual damage. A target cue on a killing turn does not mean damage was delivered: after-damage guard still skips killed monsters. Telemetry distinguishes selected targets, executed damage packets and actual HP damage.

### 메아리 박쥐 — f1_echo_bat

Before: valid cards matching the previous turn's valid final-number set added `repeated.length` stacks, max 3. No-repeat turns did not decay. Current valid-number set replaced lastValidNumbers. At actual AOE action, echo >=2 changed damage 1 to 2; every AOE then reset echo to 0.

After: at least one valid repeat adds exactly 1 (same max 3); no valid repeats removes 1, min 0. Invalid collision cards do not count. Prior-number tracking, threshold 2, base DIRECT, AOE base 1 / boosted 2, action timing and AOE reset are unchanged. Authoritative `ECHO_CHANGED` contains before/after/actual delta and repeated numbers/players; result cue reads this event. Existing monster panel retains echo count and previous valid numbers; no new UI panel.

## Matched targeted experiments

500 identical unique parties, builds and AI profiles run against each monster in each version: **2,000 encounters total**. Existing legal snapshot generator rotates EARLY/MID/LATE builds; acquisitions use actual augment/shop/rest rules. AI decision functions are copied unchanged. Seed `matched-target:<monsterId>:0..499`. Same initial HP/resources. Network entry points blocked; observed attempts 0.

| Monster / metric | PR34 | REWORK003 |
|---|---:|---:|
| Wisp samples | 500 | 500 |
| Clear / wipe | 11.2% / 88.8% | 58.4% / 41.6% |
| Mean turns | 9.904 | 14.200 |
| Mean total damage to party | 16.402 | 13.262 |
| Mean Wisp pattern HP damage | 13.684 | 9.626 |
| Mean base monster HP damage | 2.718 | 3.636 |
| Mean downs | 7.690 | 5.890 |
| Danger candidates / turn | 1.648021 | 1.754789 |
| Executed pattern targets / turn | 1.635097 | 0.816901 |
| Pattern packet trigger rate | 82.5121% | 81.6901% |
| Echo samples | 500 | 500 |
| Clear / wipe | 68.6% / 31.2% | 78.6% / 21.2% |
| Mean turns | 19.296 | 19.780 |
| Mean total damage to party | 14.494 | 12.126 |
| Mean downs | 5.002 | 4.214 |
| Mean echo after card rules / max | 1.707815 / 3 | 1.073003 / 3 |
| Boosted AOE count | 861 | 487 |
| Boosted / executed AOE | 83.5922% | 46.8269% |
| First boosted AOE mean turn | 8.423313 (489 samples) | 9.630435 (368 samples) |
| Repeat / no-repeat turns | 4592 / 5056 | 4729 / 5161 |
| No-repeat decay count | 0 | 1798 |

Echo has no separate pattern damage packet: it modifies the existing AOE; its PatternDamage column is N/A, not falsely zero. Wisp pattern/base partition uses actual post-reduction damage packets. Longer survival increases exposure, so base damage/encounter can rise despite unchanged base rules.

**Targeted exceptions: 0 in both versions. One Echo combat reached the 100-turn cap in both versions for the same party `d04c1ed8a3d75e6a4088`.** It is retained as CAP, neither clear nor wipe (0.2% of Echo denominator). No cap seed excluded or retuned. All after Wisp turns asserted selected and executed pattern targets <=1.

## 500 matched full expeditions

PR34 raw results reused from its verified runtime hash `ecb37a7e45e581b243df939695b303c3f3c0aa5a2f0205ee38cc3f69598ecbfb`. Candidate uninstrumented runtime hash `bd4d5792d01818dd76c4b6001692d8b472363b51c9ff712da72b20d0bd2ed6e7`. Seeds expedition:0..499, same initial classes/build/card pools and profiles independently asserted. Later decisions/paths can diverge through different survival and RNG consumption; matching does not claim identical late-game encounters.

| Stage | PR34 count / rate | REWORK003 count / rate |
|---|---:|---:|
| START | 500 / 100% | 500 / 100% |
| F1 first3 survived | 335 / 67% | 336 / 67.2% |
| F1 boss reached | 181 / 36.2% | 184 / 36.8% |
| F1 clear / F2 entered | 138 / 27.6% | 140 / 28% |
| F2 boss reached | 35 / 7% | 47 / 9.4% |
| F2 clear / F3 entered | 20 / 4% | 24 / 4.8% |
| F3 boss reached | 12 / 2.4% | 15 / 3% |
| RUN_CLEAR | 6 / 1.2% | 6 / 1.2% |

Both versions: 500 terminal completions, 494 failed, 6 cleared; exceptions 0, pool exhaustion 0, full-expedition turn caps 0. Candidate all six clears end at actual F3 boss victory. F1 boss/clear rise is small; no evidence of F1 becoming free.

| Exposure metric | PR34 | REWORK003 |
|---|---:|---:|
| Mean downs / run | 10.572 | 10.790 |
| Downs / 10 combat turns | 1.746168 | 1.704689 |
| Mean Flame spent / run | 4.652 | 4.718 |
| Flame spent / 10 combat turns | 0.768367 | 0.745387 |
| Mean damage taken / run | 23.250 | 23.900 |
| Damage taken / 10 combat turns | 3.840182 | 3.775910 |
| Mean combat turns / run | 60.544 | 63.296 |

Normalized metrics use pooled totals: 10 * total exposure / total combat turns, not mean per-run ratios. RUNS also carries per-run ratios. More survival can increase total downs/Flame despite lower exposure-normalized rates. Combat damage excludes event-room damage, matching PR34 measurement.

Pool sources: CURRENT_FLOOR_UNSEEN 1,994; CHOSEN_BOSS 246; PREVIOUS_FLOOR_UNSEEN **1**; all others 0. This is the unchanged PR34 fallback operating naturally, not a new selector change.

## Wisp cohorts / ranking / recommendations

Cohorts restricted to F2 entrants for opportunity comparability. Whole-run downs/Flame reported; cohorts are observational, not randomized Wisp exposure or a causal estimate.

| Cohort | PR34 | REWORK003 |
|---|---|---|
| WISP_ENCOUNTERED | 60 runs; F2 clear/F3 enter 2 (3.33%); mean downs 13.45; Flame 5.6833 | 60 runs; clear/enter 6 (10%); mean downs 15; Flame 6.1667 |
| NO_WISP | 78 runs; clear/enter 18 (23.08%); mean downs 14.9359; Flame 6.4615 | 80 runs; clear/enter 18 (22.5%); mean downs 14.9625; Flame 6.45 |

Wisp cohort downs/10 turns 1.456153 → 1.355626, Flame/10 turns 0.615301 → 0.557313. Cohort membership and routes can change between versions; increased total exposure is not a worsening rate.

Among >=30-sample monsters, new wipe ranking remains: Echo Bat 82.35% (68); Wisp 61.67% (60); Iron Bell Keeper 60.34% (58); Sewer Rat Swarm 40.89% (203); Thorn Dryad 39.58% (48). Full expedition builds/resources differ from controlled mixed-stage targeted snapshots, explaining different absolute clear rates. Report both, do not substitute one for the other.

OVER_NERF_CANDIDATE: **none detected** by descriptive rules (Wisp lowest F2-normal wipe among >=30 samples; Echo lower wipe AND damage/turn than a F1 normal). Both targets remain high risk in natural runs. No automated rebalance performed. Small/zero samples in all-36 ranking flagged; later-floor estimates have survival selection bias. Longest >=30-sample encounter remains Fallen Lord (25.71 turns).

Next proposal only: inspect Echo AOE exposure at actual F1 resource/build entry and Wisp low-HP entry/base-action overlap; then Iron Bell Keeper. Collect more F3 evidence before tuning. No additional balance values changed.

## Reporting / reproduction

[Existing spreadsheet](https://docs.google.com/spreadsheets/d/1XfdZxEvaTOBqTqG1Kblm-HpyQMk-zbgWgkUVevNMoFA/edit): seven new tabs REWORK_003_SUMMARY / TARGETED / FUNNEL / MONSTERS / WISP / ECHO / RUNS. Prior tabs untouched. WISP/ECHO contain all diagnostic turns, with aggregation blocks to their right. Dataset labels distinguish TARGETED_BEFORE, TARGETED_AFTER and EXPEDITION_AFTER. SUMMARY carries exact final HEAD/CI after verification. API readback checks values and formatting; no browser visual QA.

`PVE_REBALANCE_003_RESULTS.json` contains aggregate metrics and preserved cap details. Diagnostic helpers instrument copies outside the source checkout; production modules have no measurement hooks.

```sh
npm ci
npm test
npm run check
node scripts/pve-rebalance-003-prepare.mjs /path/to/pr34 /tmp/003-before
node scripts/pve-rebalance-003-prepare.mjs . /tmp/003-after
# In each isolated output:
node simulate.mjs 500 1 target-only
# Fresh candidate isolated output for matching expedition party generator state:
node scripts/pve-rebalance-003-prepare.mjs . /tmp/003-full
cd /tmp/003-full
node simulate.mjs 0 1 full-only
```

## Flags

```text
WISP_MULTI_TARGET_DAMAGE_REMOVED=true
WISP_PATTERN_MAX_TARGETS_PER_TURN=1
WISP_DANGER_RANGES_UNCHANGED=true
ECHO_MAX_STACK_GAIN_PER_TURN=1
ECHO_DECAYS_ON_NO_REPEAT=true
ECHO_THRESHOLD_UNCHANGED=true
MONSTER_HP_UNCHANGED=true
GLOBAL_CADENCE_UNCHANGED=true
OTHER_MONSTERS_UNCHANGED=true
FULL_TEST_SUITE_PASS=true
TARGETED_WISP_RUNS=500_PER_VERSION
TARGETED_ECHO_RUNS=500_PER_VERSION
MATCHED_EXPEDITION_RUNS=500
POOL_EXHAUSTION_ERRORS=0
SUPABASE_CALLS=0
PRODUCTION_MUTATION=0
READY_FOR_PRODUCTION=false
```
