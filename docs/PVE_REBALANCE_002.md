# PVE REBALANCE 002 — pool fallback / HP flattening

## Provenance and safety

- Baseline: PR #33, `009b496867cb7e3343be013dd2cf05c1bca35fdc`, Project Checks #987 success.
- Branch: `feat/pve-rebalance-002-pool-hp`, created directly on that cumulative HEAD.
- Gameplay source commit: `d278e888e9900c9685aa048eacd99a1b3f9b9b7b`. Subsequent report commit changes measurement floor attribution and documentation only.
- Uninstrumented PVE runtime hash: `ecb37a7e45e581b243df939695b303c3f3c0aa5a2f0205ee38cc3f69598ecbfb`.
- Main merge, deploy, migrations, production mutation, Supabase calls and browser use: **0**.
- PR33 adaptive requirements, augment thresholds 30/100/250/500, harmful action cadence +1 and Blood Frenzy ordering retained. All 36 monster definitions are identical to PR33 except the requested HP fields. No AI, pattern, damage, resource or reward balance changes.

## Selection

`pve/monster-selection.js` is shared by all three floor selectors:

1. Current floor, same tier, unseen.
2. Earlier floor, same tier, unseen; closest earlier floor first.
3. Global current/earlier floors, same tier, unseen. With complete catalogues, steps 1–2 already cover these candidates.
4. All-floor same-tier seeded repeat. F1 exhaustion reaches this step directly.

NORMAL/ELITE never cross tiers. A valid current-floor chosenBossIds entry returns without drawing RNG; invalid/missing/wrong-floor/wrong-tier entries draw from current-floor BOSS only. Existing seeded RNG and normal selection keys are retained. `run.monsterSelection` stores selection source and definition/encounter floor. Existing room entry records selected IDs with its uniqueness guard, including fallback/repeats. No Math.random or production instrumentation.

## HP

| Floor | Old NORMAL / ELITE / BOSS | New NORMAL / ELITE / BOSS |
|---|---|---|
| F1 | 90 / 160 / 240 | 90 / 160 / 240 |
| F2 | 130 / 210 / 300 | 120 / 200 / 290 |
| F3 | 160 / 280 / 420 | 145 / 230 / 340 |

All 36 runtime combat/projection HP values tested. UI uses authoritative hp/maxHp; no separate UI HP table needed.

## Verification

- Baseline full suite: **2,425 passed, 0 failed**.
- Candidate full suite: **2,481 passed, 0 failed** (+56 tests). Static check: **254 JS/TS files PASS**.
- Existing F2 exhaustion expectation updated to successful fallback. F3 HP expectations updated; half-HP mask-cycle fixture corrected to 169 below the new 170 boundary. No test deletion or gameplay assertion removal.
- Forced fallback tests cover earlier-floor NORMAL/ELITE, nearest-floor priority, exhausted earlier pools, all-floor repeats, deterministic replay, bookkeeping and actual combat resolution. Boss contract cases covered for every floor.
- CI status is reported on the Draft PR for its exact final HEAD; this source document does not claim a future CI result.

## 500 full expeditions

Seeds `expedition:0` through `expedition:499`; unchanged PR33 legal progression and AI policies SAFE / RESOURCE_AWARE / COLLISION_AVOID / RANDOM. All initial class/build/card pools match the PR33 ALL_THREE sample. Later routes, growth and RNG consumption can diverge as HP changes encounter length. No human win-rate claim.

**500 completed terminal runs, 494 RUN_FAILED, 6 RUN_CLEAR; exceptions 0, pool exhaustion errors 0, combat turn caps 0.** Caps remain 100 turns/combat and 1,200 room actions/run. Offline policy recorded network attempts 0. All six clears end with an actual F3 boss victory.

| Funnel | Count | Rate |
|---|---:|---:|
| START | 500 | 100% |
| F1 first three rooms survived | 335 | 67% |
| F1 boss reached | 181 | 36.2% |
| F1 clear | 138 | 27.6% |
| F2 entered | 138 | 27.6% |
| F2 boss reached | 35 | 7% |
| F2 clear | 20 | 4% |
| F3 entered | 20 | 4% |
| F3 boss reached | 12 | 2.4% |
| RUN_CLEAR | 6 | 1.2% |

| Metric | PR33 ALL_THREE | REWORK 002 |
|---|---:|---:|
| F1 early survival | 67% | 67% |
| F1 clear / F2 entry | 27.6% | 27.6% |
| F2 clear / F3 entry | 2.6% | 4% |
| F3 boss reached | 1.4% | 2.4% |
| RUN_CLEAR | 0.4% (2) | 1.2% (6) |
| Mean downs/run | 10.520 | 10.572 |
| Mean Flame spent/run | 4.594 | 4.652 |
| Mean combat turns/run | 59.910 | 60.544 |
| Exceptions / pool exhaustion | 1 / 1 | 0 / 0 |

More late progression can increase total run turns/downs/Flame despite reduced per-monster HP. PR33 had 499 completed runs, 497 failed and 2 cleared; one exhaustion exception remains in its denominator of 500.

| Actual encounter floor | Encounters | Clear | Wipe | Mean turns | Mean downs | Mean Flame | Mean ending HP/player |
|---|---:|---:|---:|---:|---:|---:|---:|
| F1 | 1694 | 78.6305% | 21.3695% | 14.604486 | 2.476978 | 1.171783 | 1.303867 |
| F2 | 384 | 69.2708% | 30.7292% | 12.057292 | 2.528646 | 0.770833 | 1.326172 |
| F3 | 75 | 81.3333% | 18.6667% | 12.026667 | 1.586667 | 0.600000 | 2.010000 |

Floor is captured at encounter entry because boss resolution can auto-advance it. A second identical 500-seed measurement run verified unchanged terminal outcomes, action/pool/growth/Flame traces and combat values after this attribution correction. Ending HP is the authoritative post-resolution value and includes any boss-clear heal. Encounter wipe counts include recoverable wipes, distinct from terminal RUN_FAILED.

### Pool telemetry

- CURRENT_FLOOR_UNSEEN: **1,925**.
- CHOSEN_BOSS: **228**.
- PREVIOUS_FLOOR_UNSEEN / GLOBAL_UNSEEN / GLOBAL_REPEAT / CURRENT_FLOOR_BOSS_FALLBACK: **0 each**.
- Natural fallback total: **0**, global repeat total: **0**. These 500 trajectories did not exhaust a pool; fallback correctness is separately established by forced deterministic tests. Do not interpret zero natural fallbacks as empirical coverage of every fallback path.

## Diagnostics and proposals only

Among monsters with at least 30 samples, F2 늪불 등불지기 is highest risk: 60 encounters, wipe 93.33%, mean downs 5.23. F1 메아리 박쥐: 67 encounters, wipe 86.57%. Longest: F1 몰락한 성주, 83 samples, mean 25.72 turns; 성문 파쇄 거상, 98 samples, 24.73 turns. F3 samples are sparse and conditioned on surviving earlier floors.

The F2 cliff remains: only 20/138 entrants clear (14.49% conditional); F3 6/20 clear (30%, small selected sample). Proposal: investigate Lamplighter cooperative requirement success and reactive damage, then Echo Bat failure exposure; gather larger F3 samples before additional HP tuning. These are **not implemented**.

## Google Sheets / measurement definitions

[Existing report spreadsheet](https://docs.google.com/spreadsheets/d/1XfdZxEvaTOBqTqG1Kblm-HpyQMk-zbgWgkUVevNMoFA/edit): six new REWORK_002_SUMMARY / FUNNEL / MONSTERS / FLOORS / POOL / RUNS tabs. Existing tabs retained. RUNS contains all 500 raw run rows. MONSTERS contains all 36 definitions, zero samples shown as N/A; samples below 30 are flagged. Conditional formatting highlights risk, long fights, low samples and fallback source.

`patternSuccessRate` means **player prevention**: BLOCKED / all non-WAIT turns. Harmful action count includes actual executed DIRECT_DAMAGE/AOE_DAMAGE actions only, not reactive damage. Monster stats group by definition floor; floor stats group by encounter floor. No browser visual QA; sheet data/format validation uses API readback.

Machine-readable aggregates: `docs/PVE_REBALANCE_002_RESULTS.json`.

Reproduce offline from this checkout:

```sh
npm ci
npm test
npm run check
node scripts/pve-rebalance-002-prepare.mjs . /tmp/pve-rebalance-002
cd /tmp/pve-rebalance-002
node simulate.mjs 0 1 full-only
```

## Final flags

```text
MONSTER_POOL_FALLBACK_IMPLEMENTED=true
MONSTER_TIER_PRESERVED=true
BOSS_SELECTION_CONTRACT_PRESERVED=true
HP_CURVE_FLATTENED=true
PR33_FEATURES_PRESERVED=true
FULL_TEST_SUITE_PASS=true
RANDOM_EXPEDITION_RUNS=500
SUPABASE_CALLS=0
PRODUCTION_MUTATION=0
READY_FOR_PRODUCTION=false
```

Google Sheet publication and exact-HEAD CI are verified separately in the final task report. No merge or deploy authorized for this task.
