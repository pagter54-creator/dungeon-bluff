# PVE SYSTEM REBALANCE 001

## Delivery / provenance

- Baseline integrated main: `67fa8e6b0cee1524749151b07c382934bfbe6e04`.
- Branch: `feat/pve-system-rebalance-001`; draft review only. No main merge or backend/frontend deployment.
- Measured gameplay commit: `a19d31ac246a854bd2759d1819e9711eabd682ad`. Subsequent commit contains measurement tooling, fixtures and this report; gameplay is identical.
- Uninstrumented PVE kernel SHA256: `2f459185115a8d42ae9f498576a7618f693b3ff100913d516fbf630e4739dd61`.
- Supabase calls 0; production mutations 0; migrations 0; actual settlement 0. Settlement tests use the existing in-memory RPC fixture.
- Baseline: 2,357 tests pass / 0 fail. Candidate: 2,425 tests pass / 0 fail. Static check: 250 JS/TS files parsed and references checked, PASS.
- Raw previous analysis and original Google Sheets tabs were preserved. Seven REWORK tabs added; all cells read back and compared, all seven matched. Native formatting and conditional rules verified via Sheets metadata. No screenshot-based visual QA or production browser play was performed.

## Runtime changes

### Blood Frenzy ordering

HP cost uses the canonical pre-resolution `berserkerExpectedHpCost` snapshot. A same-resolve heal (including TWINS_SUN) cannot change the already accepted cost. An action guard prevents duplicate cost application. Five original failing SUBMITTED snapshots now resolve successfully and produce identical replay HP/status/card state; five complete offending encounters also replay without exceptions or turn caps. Damage bonuses and class effects are unchanged.

Original coordinates: `random:87:2` turn 6; `random:1686:2` turn 18; `random:2183:1` turn 17; `random:2183:2` turn 27; `target-counter:f3_abyss_king:berserker:68` turn 5.

### Adaptive requirement matrix

Contributors are players that are not DOWNED and can submit. STUNNED_NEXT_TURN counts because the server submits a normally resolved card. Explicit metadata selects the field; unrelated conditions do not scale. Damage/sum/window requirements use ceil(base × count / 4), minimum 1. Valid/distinct count uses an explicit 3/3/2/1 table. The same helper drives authoritative resolution, telegraph, description and presentation.

| Monster | Requirement | 4 | 3 | 2 | 1 |
|---|---|---:|---:|---:|---:|
| 비겁한 사냥꾼 | Valid cards | 3 | 3 | 2 | 1 |
| 녹슨 발리스타 | Valid cards | 3 | 3 | 2 | 1 |
| 묘지 파수병 | Valid cards | 3 | 3 | 2 | 1 |
| 공성대장 | Valid cards | 3 | 3 | 2 | 1 |
| 몰락한 성주 | Valid cards | 3 | 3 | 2 | 1 |
| 성문 파쇄 거상 | Damage / 3-turn window | 30 | 23 | 15 | 8 |
| 굶주린 슬라임 | Party damage | 8 | 6 | 4 | 2 |
| 혼돈 고블린 | VALID_SUM only | 10 | 8 | 5 | 3 |
| 뿌리턱 히드라 | Distinct valid numbers | 3 | 3 | 2 | 1 |
| 달을 삼킨 마녀 | MIN_DAMAGE only | 10 | 8 | 5 | 3 |
| 왕실 세금징수관 | Valid sum | 10 | 8 | 5 | 3 |
| 검은 성가대 | Distinct valid numbers | 3 | 3 | 2 | 1 |
| 처형 골렘 | Valid hits / 2-turn window | 5 | 4 | 3 | 2 |

Window progress is preserved and the requirement recomputed if a player goes down midwindow. Moon MAX_DAMAGE=7, Chaos ODD/LOW_NUMBER and non-cooperative requirements are unchanged. The impossibility flag refers to these count requirements with at least one contributor; it does not promise that every legal card hand can satisfy a sum/damage condition.

### Growth and base-action cadence

EXP thresholds `[50,150,350,750]` → `[30,100,250,500]`. Per-player damage EXP, kill EXP, tiers, choice order and augment effects are unchanged. Boundary tests include immediately below/at/above all thresholds.

All 36 monster definitions declare base-action delay 1. The base sequence is expanded with one CHARGE immediately before each DIRECT_DAMAGE / AOE_DAMAGE action. The intent index comes from this expanded sequence; combat.turn and reactive clocks continue normally. Inserted charge does not consume target RNG. BITE_COUNT, mask parity, moon cycles, window durations, tax, choir and other reactive triggers retain their existing clocks and damage.

## Measurement / reproducibility

S01 snapshots accepted submission skill intent before clearing it and classifies the final outcome by validity. Immediate activation is measured separately; accepted prediction setup is not counted as a successful future prediction. All arms reconcile uses = success + failure.
S02 records every actual Flame before→after transition, separately summing gain and consumption. S03 observes all four internal result-publication points before recursive beginTurn; encounter turn sums equal observed internal turns in every arm.
The offline event adapter invokes the existing event availableCards preparation only for an empty remaining hand. This prevents a false EVENT_NO_LEGAL_CARD in the original simulator. No production event code is changed.

```sh
node scripts/pve-rebalance-prepare.mjs /baseline-checkout /candidate-checkout /isolated-output
# Run both commands inside each of the five generated condition directories:
node simulate.mjs 0 500 full-only
node simulate.mjs 300 1
```

The prepare step copies and instruments isolated runtimes outside both source checkouts. It disables every network entrypoint in the simulator, creates a manifest per condition, and records source hashes. Do not instrument production modules. Machine-readable aggregates, stratification and all exception coordinates are in `PVE_SYSTEM_REBALANCE_001_RESULTS.json`.

2,500 full expeditions (500 per arm), 1,500 controlled encounters (300 per arm). Full seeds, initial classes, builds and AI profiles match. Controlled party/build/profile tuples match exactly across all five arms; stages use the same initial 1/2/4 augment snapshots. Therefore controlled EXP_ONLY is not an earlier-acquisition experiment. All original 260 CONTROL terminal states match the original saved 260 runs exactly.
CONTROL uses the exact old runtime. The four treatments also include the same Blood Frenzy ordering fix, so they are not a strict three-factor factorial independent of that fix. CONTROL full500 contains no ordering exceptions; the five failing cases were separately isolated. Cadence changes target RNG consumption and later maps; shared seeds/policy do not ensure identical later monsters. Later-floor full-run cohorts are selected survivors, not controlled encounter samples.

## Full expedition ablation (500 per condition)

| Arm | Early3 survival | F1 boss reach | F2 entry / F1 clear | F3 entry / F2 clear | RUN_CLEAR | Downs/run | Flame/run | Combat turns/run | First augment room | Exceptions |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| CONTROL | 38.2% | 11.2% | 3.6% | 0.0% | 0.0% | 8.6 | 4.148 | 28.948 | 3.727473 | 0 |
| ADAPTIVE_ONLY | 46.6% | 14.8% | 9.2% | 0.0% | 0.0% | 9.354 | 4.238 | 35.856 | 4.003252 | 0 |
| EXP_ONLY | 46.8% | 14.4% | 8.8% | 0.2% | 0.0% | 9.286 | 4.228 | 35.328 | 2.403509 | 0 |
| CADENCE_ONLY | 67.6% | 34.2% | 23.6% | 2.0% | 0.6% | 10.32 | 4.538 | 57.764 | 4.119891 | 1 |
| ALL_THREE | 67.0% | 36.2% | 27.6% | 2.6% | 0.4% | 10.52 | 4.594 | 59.91 | 2.619661 | 1 |

Early3 means at least the first three F1 room resolutions completed, not just reaching depth 3. Errors remain in the 500-run denominators. No turn cap occurred in any arm, full or controlled.

### Original matched 260 subset

| Arm | Early3 survival | F2 entry | F3 entry | RUN_CLEAR |
|---|---:|---:|---:|---:|
| CONTROL | 35.4% | 3.1% | 0.0% | 0.0% |
| ADAPTIVE_ONLY | 41.9% | 8.8% | 0.0% | 0.0% |
| EXP_ONLY | 42.7% | 10.0% | 0.0% | 0.0% |
| CADENCE_ONLY | 66.9% | 21.9% | 1.9% | 0.8% |
| ALL_THREE | 66.2% | 27.3% | 2.3% | 0.4% |

### Interpretation

F2 entry improves 18/500 → 138/500; F3 entry 0/500 → 13/500; RUN_CLEAR 0/500 → 2/500. Cadence-only clears 3/500. With only 2–3 clears, no significance or ordering between these arms is claimed. The requested changes improve the early funnel but do not establish acceptable full-run difficulty.
Absolute downs 8.600 → 10.520 and Flame spent 4.148 → 4.594 increase while combat exposure more than doubles (28.948 → 59.910 turns/run). These totals do not demonstrate worse damage per encounter. Controlled floor/tier strata and monster comparisons include party damage, damage taken, downs, remaining HP and Flame.
First augment conditional mean room 3.727 → 2.620. Acquisition cohort expands from 455 to 1,475 player acquisitions, so compare the denominator and coverage as well as the conditional mean. EXP_ONLY: 2.404; CADENCE_ONLY: 4.120. Earlier access is visible but survivor cohort selection also changes.

### Largest controlled monster clear-rate changes (descriptive only)

| Monster | Samples per arm | CONTROL | ALL_THREE | Damage taken before → after | Downs before → after |
|---|---:|---:|---:|---:|---:|
| 공성대장 | 8/8 | 25.0% | 75.0% | 15.125 → 13.75 | 6.875 → 5 |
| 혼돈 고블린 | 8/8 | 50.0% | 100.0% | 14.75 → 12.625 | 6.125 → 4 |
| 무효의 종사제 | 8/8 | 37.5% | 87.5% | 13.625 → 8.625 | 6.5 → 3.875 |
| 메아리 박쥐 | 8/8 | 25.0% | 62.5% | 19.375 → 16.875 | 7.75 → 5.875 |
| 기술먹이 사역마 | 8/8 | 50.0% | 87.5% | 15.25 → 12.125 | 5.5 → 3.625 |

These samples are only 8 per arm: do not rank balance conclusions as statistically established. Samples below 30 are gray in the Sheet. Harmful base actions/10 turns count actual executed intents after monster transformation; reactive damage is reported in total damage taken separately.

## Remaining blockers and scope

- CADENCE_ONLY seed `expedition:283`: F3 monster pool exhausted.
- ALL_THREE seed `expedition:347`: F2 monster pool exhausted.
- These failures come from the existing unique-pool selector/path policy. The rebalance increases reach into later floors and exposes them; errors are retained. They require a separate map/pool policy decision and are not silently fixed in this PR.
- The existing lifecycle test now looks ahead through public map edges using remaining NORMAL/ELITE pool quotas to choose a feasible full path. Actual API actions, reconnect, retries, three floors, skill and settlement assertions remain. This is a controlled lifecycle fixture, not the balance AI policy; the natural balance policy remains unchanged and can still hit the reported blockers.
- Suggest a separate pool/path consistency repair and then another matched trial. Further difficulty changes require review; no additional HP, damage, class, augment-effect, relic, engraving, AI, rest or Flame balance changes were made.

## Google Sheets

- [REWORK_001_SUMMARY](https://docs.google.com/spreadsheets/d/1XfdZxEvaTOBqTqG1Kblm-HpyQMk-zbgWgkUVevNMoFA/edit#gid=910060)
- [REWORK_001_ABLATION](https://docs.google.com/spreadsheets/d/1XfdZxEvaTOBqTqG1Kblm-HpyQMk-zbgWgkUVevNMoFA/edit#gid=910061)
- [REWORK_001_EXPEDITION](https://docs.google.com/spreadsheets/d/1XfdZxEvaTOBqTqG1Kblm-HpyQMk-zbgWgkUVevNMoFA/edit#gid=910062)
- [REWORK_001_MONSTERS](https://docs.google.com/spreadsheets/d/1XfdZxEvaTOBqTqG1Kblm-HpyQMk-zbgWgkUVevNMoFA/edit#gid=910063)
- [REWORK_001_GROWTH](https://docs.google.com/spreadsheets/d/1XfdZxEvaTOBqTqG1Kblm-HpyQMk-zbgWgkUVevNMoFA/edit#gid=910064)
- [REWORK_001_ADAPTIVE](https://docs.google.com/spreadsheets/d/1XfdZxEvaTOBqTqG1Kblm-HpyQMk-zbgWgkUVevNMoFA/edit#gid=910065)
- [REWORK_001_RUNTIME](https://docs.google.com/spreadsheets/d/1XfdZxEvaTOBqTqG1Kblm-HpyQMk-zbgWgkUVevNMoFA/edit#gid=910066)

Headers frozen; filters, wrapped labels, percentage formats and green/red comparison rules added. Low samples and rare clears gray; exceptions red. Existing 19 tabs untouched.

## Technical flags

```text
BLOOD_FRENZY_ORDERING_FIXED=true
ADAPTIVE_PATTERN_SYSTEM=true
NO_IMPOSSIBLE_COOP_REQUIREMENT=true
AUGMENT_THRESHOLDS_30_100_250_500=true
MONSTER_HARMFUL_ACTION_CADENCE_PLUS_ONE=true
REACTIVE_PATTERN_CADENCE_PRESERVED=true
MEASUREMENT_BUGS_FIXED=true
MATCHED_ABLATION_COMPLETE=true
GOOGLE_SHEETS_REWORK_REPORT=true
SUPABASE_CALLS=0
PRODUCTION_MUTATION=0
BALANCE_SCOPE_EXPANDED=false
READY_FOR_PRODUCTION=false
```
