# PVE deterministic stress test harness

Source specification: `눈치레이드_PVE_극단조합_자동테스트_v1.md`.

## Commands

```bash
# PR smoke: 10 deterministic seeds per available scenario
npm run pve:stress:smoke

# Balance sweep: 100 deterministic seeds per available scenario
npm run pve:stress:balance

# Pre-BETA stress: 500 deterministic seeds per available scenario
npm run pve:stress:full

# Replay one failed seed exactly
npm run pve:stress -- --scenario T14 --seed "smoke:T14:0000"

# Custom count/output
npm run pve:stress -- --mode balance --count 25 --output artifacts/pve-stress
```

The harness executes the server PVE rule engine directly. It does not run browser UI, animation, or client timers.

## Bot information boundary

Normal stress bots receive only `projectRun(run, playerId)`.
Their action selector accepts the projected PlayerView and never receives the authoritative run.
Every decision also executes `assertNoHiddenInfo()`.

T13 Perfect Coordination is the only scenario allowed to use an authoritative/privileged planner. T13 is not implemented yet.

## Result levels

- `FAIL`: invariant/rule-engine failure. CI exits non-zero.
- `BALANCE_WARNING`: numeric balance signal only. CI remains green.
- `PASS`: no hard failure and no warning.
- `SKIP`: required PVE character/build/content is not executable yet. The harness never substitutes a different character/build.

Hard failures currently cover:
- non-deterministic same-seed replay
- softlock / turn or action ceiling
- hidden PlayerView private state/raw submission leak
- duplicate physical card instance across zones
- zone references to missing cards
- negative/NaN/Infinity HP, Flame, gold, EXP, numeric class resources
- HP/Flame/resource cap violations currently known to the engine
- DOWNED player submission
- combat-only resource leakage once a combat reaches COMBAT_END
- impossible selected-card zone state

## Generated files

Default directory: `artifacts/pve-stress/`

- `pve_stress_summary.json`
- `pve_failed_seeds.json`
- `pve_stress_seeds.csv`
- `pve_skipped_scenarios.json`
- `pve_spec_ambiguities.json`
- `scenarios/<scenarioId>.csv`

GitHub Actions uploads the entire directory as `pve-stress-smoke-<sha>`.

## Current scenario activation

| Scenario | Current state | Reason when skipped |
|---|---|---|
| T00 Reference | SKIP | PVE rogue not implemented; named augment builds are metadata-only |
| T05 Number Mutation | SKIP | PVE vampire/imp not implemented; named build effects not executable |
| T09 Resource Starvation | SKIP | PVE prophet not implemented |
| T14 Flame Boundary | ACTIVE | six synthetic ordering/boundary fixtures |
| T02 Burst Ceiling | SKIP | demon swordsman/martial artist/berserker PVE engines and named build effects unavailable |
| T03 Sustain Fortress | SKIP | vampire/berserker PVE engines and named build effects unavailable |
| T04 Collision Farm | SKIP | imp/berserker/vampire PVE engines and named build effects unavailable |
| T06 Recovery Loop | SKIP | prophet/demon swordsman PVE engines and named build effects unavailable |

Availability is computed from runtime character/build definitions. This table is documentation only; the generated SKIP report is authoritative.

## T14 fixtures

T14 currently locks six boundary cases:
1. Flame 1 + one lethal player hit
2. Flame 1 + two simultaneous lethal player hits
3. Flame 0 + one survivor / three DOWNED, including successful next-turn progression
4. Flame 0 + four simultaneous lethal hits
5. boss kill + full-party wipe in the same resolve
6. healing + lethal damage in the same resolve

A semantic golden fixture is stored at:
`tests/fixtures/pve-stress-t14-golden.json`

Volatile timestamps are removed before deterministic fingerprints are compared.

## Current spec/rule ambiguities

The generated `pve_spec_ambiguities.json` records these instead of silently changing rules:

- T14 boss-kill + full wipe precedence: current engine resolves RUN_FAILED before boss-clear revival.
- T14 heal + lethal precedence: PLAYER_DAMAGED healing runs before DOWN_RESOLVE, so immediate healing can prevent DOWN.
- named augment builds exist as selection metadata but their effects are not executable yet.
- stress-spec “stun/death” wording differs from server `STUNNED_NEXT_TURN` / `DOWNED` states.

No production balance numbers are changed by the stress harness.
