# PVE REBALANCE 004 — Iron Bell Keeper / F2 Boss Audit

Date: 2026-10-06 (Asia/Seoul). Source PR35 HEAD: `c0b3fc93f45cced5b1538349ab341dbf2f01bb42`.
Branch: `feat/pve-rebalance-004-iron-bell-boss-audit`. Draft PR only; main integration and deployment forbidden.
Exact final commit and CI are recorded in PR metadata and REWORK_004_SUMMARY after committing this report.
SUPABASE_CALLS=0; PRODUCTION_MUTATION=0; READY_FOR_PRODUCTION=false.

## Iron Bell exact BEFORE / AFTER

BEFORE: PARITY_BELL initially ODD; odd/even rotation occurs in `executeMonsterIntent` via `advanceMonsterPhase(state,['ODD','EVEN'])`, including CHARGE. The wrong final parity of a valid card adds damagePenalty=1 to monsterDamagePenalty. The ordinary primary packet is clamped after base/class damage, engravings, martial/vampire/ghost bonuses, effective defense and accumulated penalties. Gambler set damage and BEFORE_DAMAGE effects run afterwards. Bell did not guarantee nonzero damage. Its HP160 and CHARGE/DIRECT_DAMAGE1 templates use unchanged PR33+ harmful cadence delay1.

AFTER: retain the accumulated penalty for backward-compatible metadata; mark its bell contribution separately with parityBellPenalty=1 / parityBellMinimumDamage=1. Subtract other penalties/defense first. Apply `max(1, beforeBell-1)` only when beforeBell>=1. Already-zero damage stays zero. Later class, augment and Imp damage rules retain authority to reduce damage to zero; all-in set damage remains its existing override. No global floor, no effect on invalid cards or follow-ups. Boundary tests cover ODD1/2/3/4/5→1/1/3/3/5 and EVEN→1/2/2/4/4, independent defense/other penalty zero, invalidity and rotation/reconnect metadata. Existing panel displays which parity is penalized and limits the minimum guarantee to bell-only reduction.

| Samples | ClearRate | WipeRate | AvgTurns | AvgPartyDamage | AvgDamageToParty | AvgDowns | AvgFlameSpent | DamageTakenPer10Turns | DownsPer10Turns | AvgPatternDamage | AvgBaseActionDamage | Exceptions | TurnCaps | Version | WrongParityCards | WrongParityZeroDamageBefore | WrongParityMinimumDamageAppliedAfter |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 500 | 0.982 | 0.016 | 23.226 | 163.896 | 5.262 | 1.574 | 1.376 | 2.265564453629553 | 0.6776887970378025 | 0.0 | 5.262 | 0 | 1 | BEFORE | 11088 | 1011 | 0 |
| 500 | 0.982 | 0.016 | 22.9 | 164.07 | 5.182 | 1.528 | 1.344 | 2.262882096069869 | 0.6672489082969433 | 0.0 | 5.182 | 0 | 1 | AFTER | 10953 | 0 | 1175 |

500 identical legal parties, build IDs, profiles and seeds per version. One identical party reaches the 100-turn cap in both; kept in denominators, neither clear nor wipe. Bell floor applied1175 times AFTER; bell-only 1→0 actual primary packets1011 BEFORE. These are separate trajectories and not paired individual card events. Minimum floor applications measure the ordinary damage-build stage; later overrides may differ.

## Elite over-nerf comparison

Each of all seven F1 NORMAL definitions receives the same500 parties on the candidate, 3500 diagnostic encounters. No values changed. Descriptive warning rule: elite clear exceeds the easiest NORMAL by >5 percentage points, wipe is lower and average turns <80% of that NORMAL. This operationalizes “much easier” and is not automatic tuning.
OVER_NERF_CANDIDATE=False.

| Monster | Samples | ClearRate | WipeRate | AvgTurns |
| --- | --- | --- | --- | --- |
| f1_armored_boar | 500 | 0.994 | 0.004 | 14.056 |
| f1_chain_jailer | 500 | 0.994 | 0.004 | 13.08 |
| f1_coward_hunter | 500 | 1 | 0 | 12.334 |
| f1_gate_guard_dog | 500 | 0.992 | 0.006 | 12.286 |
| f1_graveyard_sentinel | 500 | 0.992 | 0.006 | 15.23 |
| f1_rusty_ballista | 500 | 0.952 | 0.048 | 11.862 |
| f1_sewer_rat_swarm | 500 | 0.854 | 0.146 | 11.436 |

Normal-comparison exceptions0; four turn caps retained. Targeted growth snapshots are not natural early-entry encounters; high target clear rate does not imply human early-run win rate.

## F2 boss definitions — audit only

Both HP290, damage, mechanics and cadence byte-identical to PR35. Rottenheart tracks each owner's previous VALID final number; repeat increments corruption, threshold3 schedules DIRECT1 and resets that player's stack0. Invalid cards do not change history. Scheduled penalties are skipped on killing turns. Moon alternates MIN on odd turns, MAX on even: adaptive MIN4/3/2/1contributors=10/8/5/3; MAX<=7. A failed surviving turn deals random-living DIRECT1, followed by unchanged base boss action. Pattern vs base damage is tagged only in isolated simulation copies, never production code.

## Cohorts and limitations

Each boss250:125 CONTROLLED_FRESH and125 EXPEDITION_LIKE. The two bosses share the same125 fresh legal MID build sets and profiles. MID acquisition uses real reward/shop/rest paths, two legal augment tiers, stage-limited relic/engraving/card growth; fullHP and flame4.

Reproduced the entire PR35 500 deterministic expeditions to capture47 exact F2 boss-entry states. Original reproduction matches aggregate turns31648, damage11950, downs5395, clears6. EXPEDITION_LIKE cyclically resamples all47 states into125 slots per boss; preserves HP, Flame, augments, relics, engravings, physical card zones, class resources and profiles. Matching-source boss states are reused; the other boss is substituted by swapping only the monster/telegraph, not restarting player combat initialization. Seed is diagnostic and distinct per slot. These125 rows are not125 independent empirical source observations. Original47 states mean augments2.6543/player, HP2.9574/player; survivor selection and stronger realized growth explain why expedition-like can outperform fresh. Cohorts are not an HP-only controlled experiment.

## Legal-solution / AI artifact diagnostics

Current AI policy is unchanged. Moon oracle enumerates current publicly selectable physical cards and validated submission skills (including Mage legal direction/mana options), verifies packets through the same runtime's early damage-build path on cloned isolated state. Forced auto-submissions stay fixed. Enumerates using printed public numbers, not future hand/RNG; exits on a witness, otherwise exhausts this submission-option set. Searches do not execute enemy damage or advance the real run. All recorded oracle verdicts were deterministic ACHIEVABLE / no submission-window solution; no RNG-dependent verdicts occurred.

Oracle does **not** enumerate new immediate activations or alternative Gambler draw-choice windows; “no legal solution” refers to the documented submission search scope, not a theorem about every possible gameplay skill sequence. Actual successful turns prove ACHIEVABLE even when a narrower oracle finds no witness. Failed turns with witnesses are AI_MISPLAY, or COLLISION_CAUSED_FAILURE when the actual cards collided; without witnesses are IMPOSSIBLE_DUE_TO_CURRENT_HANDS within scope. Adaptive MIN is structurally possible at1–4 contributors; player-count-only impossible count0. Oracle witness details, checked ranges and contributor breakdowns are retained in Sheets.

Rottenheart forcedRepeat is specifically “all available parity-legal physical printed numbers equal previous valid final number.” It is a card-hand pressure diagnostic, not proof that number-modifying skills cannot rescue the situation. ForcedRepeatRate denominator=actual repeat player-turns; NoLegalSolutionRate denominator=eligible player-turns with a previous valid number and nonempty legal physical pool. CORRUPTION procs are scheduled threshold crossings; damage is actually executed post-reduction, and killing turns may skip scheduled hits.

Failure attribution is heuristic: >=80% base share→BASE_ACTION_DAMAGE, pattern greater than base→PATTERN_DAMAGE, otherwise MIXED. LONG_COMBAT>=35turns, legal-solution misses/collisions/forced hand state are secondary labels; HP_ATTRITION denotes the observed resource endpoint, not an experimentally isolated cause.

## Boss results

| Boss | Cohort | Samples | ClearRate | WipeRate | AvgTurns | AvgPartyDamage | AvgDamageToParty | AvgPatternDamage | AvgBaseActionDamage | AvgDowns | AvgFlameSpent | NoLegalSolutionRate | LegalSolutionMissRate | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| f2_rottenheart_ancient | CONTROLLED_FRESH | 125 | 0.2 | 0.8 | 27.032 | 221.232 | 15.408 | 1.04 | 14.368 | 7.392 | 3.936 | 0.03234152652005175 | 0.07105895398262797 | HP_ATTRITION / MIXED |
| f2_rottenheart_ancient | EXPEDITION_LIKE | 125 | 0.728 | 0.272 | 22.64 | 278.336 | 9.832 | 0.624 | 9.208 | 2.536 | 0.888 | 0.03173582073549909 | 0.06250670097566205 | HP_ATTRITION / MIXED |
| f2_moon_eating_witch | CONTROLLED_FRESH | 125 | 0.016 | 0.984 | 17.816 | 146.768 | 16.608 | 7.456 | 9.152 | 7.984 | 4 | 0.20123565754633715 | 0.7987643424536628 | AI_POLICY_ARTIFACT / HAND_STATE_PRESSURE / HP_ATTRITION / MIXED |
| f2_moon_eating_witch | EXPEDITION_LIKE | 125 | 0.168 | 0.832 | 18.736 | 212.648 | 13.88 | 6.072 | 7.808 | 4.888 | 1.32 | 0.157502329916123 | 0.842497670083877 | AI_POLICY_ARTIFACT / HAND_STATE_PRESSURE / HP_ATTRITION / MIXED |

Per-player repeat frequency, proc counts, phase damage and all1–4contributor success rates are in RESULTS.json and raw Sheet tabs. Moon phase success rates and hand pressure are descriptive, not human win-rate estimates. Moon is the larger measured bottleneck in both cohorts; strong damage builds conflict with MAX<=7 and current policies do not consistently adapt to the public phase. Rottenheart's corruption contributes only ~6–7% of received damage; base-action attrition dominates this experiment. No boss change applied.

## Full expedition smoke — same first250 seeds as PR35

| Metric | PR35 | REWORK004 | Delta |
| --- | --- | --- | --- |
| Runs | 250 | 250 | 0 |
| F1Early | 165 | 165 | 0 |
| F1Clear | 70 | 70 | 0 |
| F2Enter | 70 | 70 | 0 |
| F2BossReach | 24 | 24 | 0 |
| F2Clear | 9 | 9 | 0 |
| F3Enter | 9 | 9 | 0 |
| RUN_CLEAR | 3 | 3 | 0 |
| Exceptions | 0 | 0 | 0 |
| TurnCaps | 0 | 0 | 0 |
| PoolExhaustion | 0 | 0 | 0 |

Exact initial build IDs/content and profiles verified. All250 terminal;3 RUN_CLEAR. Full exceptions0/caps0/pool exhaustion0. No F1/F2 funnel improvement detected at this sample size.

## Regression and reproducibility

Baseline whole suite2499pass0fail. Candidate whole suite2514pass0fail; no existing tests deleted or assertions relaxed. Static262files PASS. Definition audit confirms all36HP/pattern/mechanic values preserved and35other definitions unchanged; eight scripted turns for each other monster yield identical state/events/cards/intent. All other PVE runtime files are byte-identical except documented common combat/presentation call sites. Wisp/Echo PR35 behavior preserved. No browser or Supabase call.

`node scripts/pve-rebalance-004-prepare.mjs <checkout> <outside-checkout-output>` clones and instruments offline copies, records source runtime hash. `node simulate.mjs 500 1 target-only` compares Bell; `PVE_NORMAL_AUDIT=true` uses all7normals. `node simulate.mjs 0 1 full-only` with PVE_EXPEDITION_COUNT=250 runs candidate smoke (baseline500 harvest supplies empirical entries). `PVE_BOSS_SNAPSHOTS=<harvest-results-0.json> node simulate.mjs 125 1 boss-only` runs both bosses. All network APIs are denied in harness.

Baseline runtime hash bd4d5792d01818dd76c4b6001692d8b472363b51c9ff712da72b20d0bd2ed6e7; candidate6ccd437aab8b68a2972c53b4c690598087be8a8f6c4e3744e879a7d4014ab0da.

## Follow-up REBALANCE005 proposals only

1. Prioritize Moon's MAX phase and AI public-pattern response before assuming a blanket boss HP nerf. Compare a separately authorized pattern-aware policy on the same cohorts; then consider narrowly scoped MAX design after user approval.
2. For Rottenheart, investigate base attack exposure / encounter length before nerfing corruption (small observed damage share).
3. Retain Bell's small correction; natural early-entry difficulty remains different from grown snapshots.
4. More independent F2 boss-entry states and additional immediate/draw-choice oracle coverage would strengthen diagnosis.

Report: https://docs.google.com/spreadsheets/d/1XfdZxEvaTOBqTqG1Kblm-HpyQMk-zbgWgkUVevNMoFA/edit
New7REWORK_004tabs only; existing39tabs preserved. Raw diagnostics included, frozen headers/filters/rate and warning formats. Final exact commit/CI recorded after commit. No merge/deploy.

## Success flags

```json
{
  "IRON_BELL_IDENTITY_PRESERVED": true,
  "IRON_BELL_PARITY_ROTATION_UNCHANGED": true,
  "IRON_BELL_WRONG_PARITY_MINUS_ONE": true,
  "IRON_BELL_PENALTY_ALONE_CANNOT_ZERO_DAMAGE": true,
  "OTHER_MONSTERS_UNCHANGED": true,
  "ROTTENHEART_AUDIT_RUNS": 250,
  "MOON_WITCH_AUDIT_RUNS": 250,
  "F2_BOSS_VALUES_CHANGED": false,
  "FULL_EXPEDITION_SMOKE_RUNS": 250,
  "FULL_TEST_SUITE_PASS": true,
  "SUPABASE_CALLS": 0,
  "PRODUCTION_MUTATION": 0,
  "READY_FOR_PRODUCTION": false
}
```
