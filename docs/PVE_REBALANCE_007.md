# REBALANCE 007 — Black Choir AI-limit diagnostic

Source main: b3710cfb43b808719e0dfb1952a4d70a8e641138. PR38 head: c0a6a0f6a5997108ba1163bdba20f28917d49027, merged.

This branch adds offline scripts, tests, a compressed snapshot fixture, and an Actions workflow only. Production runtime, all 390 augments and monster definitions remain byte-for-byte unchanged.

## Experiment

200 matched samples per arm: CURRENT_AI, COOP_PATTERN_AI, JOINT_ACTION_ORACLE. EXPEDITION_LIKE_F3 only, 600 encounters. Twenty-five compatible REBALANCE006 empirical F3 entry states are resampled eight times. The fixture records its original artifact checksum and runtime hash. Room context, Gambler zones and opaque deterministic combat identity are restored identically in every arm. Samples are correlated and are not 200 independent parties.

CURRENT_AI explicitly invokes the unmodified production `autoSubmitAi` function in an isolated runtime copy. All four actors use this AI for the diagnostic, with original forced submissions preserved. This differs from the profile policies used in the previous 006 experiment; the earlier 58% must not be interpreted as a matched baseline.

COOP_PATTERN_AI receives owner legal candidates, public full pool compositions, public pattern and seat-ordered prior bucket intents. It never receives teammate selected cards, remaining hands, private revelations, or future RNG. It ranks new distinct contribution, collision protection/risk, damage and cost with stable ties. It is an offline intent planner, not gameplay communication.

Oracle enumerates legal physical submissions and server-validated submission-time skill toggles, including deterministic Mage options, protected collisions and exchanges. Every combination replays the real number-mutation, collision, validity and damage pipeline. Search stops at 512 combinations. An isolated RNG guard rejects a random branch before any RNG result is read. Immediate activations/draw rerolls/random skills are outside this oracle's scope. A found witness is legal; a capped best action is not necessarily globally optimal. NO_LEGAL_SOLUTION requires exhaustive deterministic enumeration. Otherwise classify SEARCH_INCOMPLETE or RNG_DEPENDENT. Never infer unrestricted human impossibility from this restricted search.

Failed-turn legal miss rate uses only resolved deterministic existence/impossibility diagnoses as its denominator; unknown counts are reported separately. Errors and turn caps are excluded from normal aggregates and invalidate the dataset. Terminal kill turns are excluded from pattern opportunities. Recursive forced turns lacking their own oracle snapshot are unknown, not assigned another turn's witness.

## Automation

`.github/workflows/pve-balance-lab.yml` exposes workflow_dispatch parameters and caps runtime at 60 minutes, with `pve-balance-lab` concurrency and no cancellation. Controlled/both choices are reserved for follow-up implementation and rejected by this first-stage harness to prevent accidentally running 1,200 encounters.

The new workflow is not on default main and the connected GitHub API offers no workflow-dispatch operation. A one-time push trigger restricted to this diagnostic branch and workflow path starts the initial 600 encounters without merging main. Both initial and manual runs have the same defaults. Artifact upload runs even on failure; progress appears every 25 encounters. Full regression and source checks precede the experiment in Actions.

Artifacts: black_choir_ai_limit_summary.json, black_choir_ai_limit_encounters.csv, black_choir_ai_limit_turns.csv, black_choir_ai_limit_failures.csv, black_choir_ai_limit_metadata.json.

## Local verification before Actions

Nine new policy/provenance tests pass. The final complete regression suite passes after restoring the copied checkout's missing PGlite dependency and synchronizing the five main-only skin/migration/test files. Source checks parse 280 JS/TS files and validate local module/HTML asset references. A three-sample-per-arm wiring smoke has zero exceptions, zero turn caps and identical initial-state hashes across arms. It is not included in the final 200-per-arm experiment or used to draw balance conclusions.

SUPABASE_CALLS=0; PRODUCTION_MUTATION=0; MIGRATIONS=0; NO_GAMEPLAY_NUMERIC_CHANGES=true; READY_FOR_PRODUCTION=false. No main merge or deployment is authorized for this diagnostic. Stop after confirming Actions has queued/started; results will be analyzed on the user's follow-up.
