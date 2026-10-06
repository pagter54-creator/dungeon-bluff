# PVE REBALANCE 005 — reworked Prophet/Vampire matched experiment

## Provenance / user override

Built on PR36 cumulative HEAD `378549e935be04925114ae032fc04655f185b64e`, integrating confirmed class core from main `56f2f9098cec3a91efef3568896628f209d6a9e1` with common ancestor `67fa8e6b0cee1524749151b07c382934bfbe6e04`. The user explicitly overrode the original exclusion of Prophet/Vampire. The same new core and 60 augment contracts are used in ALL four arms. Old CONTROL statistics are not reused.

Branch `feat/pve-rebalance-005-moon-ai`. Draft PR only; no main merge/deploy, Supabase calls0, production mutations0, migrations0. READY_FOR_PRODUCTION=false.

## Exact runtime audit

BEFORE MIN: `sum(damagePackets.amount) >= patternRequirement(run,'minimumDamage')`, authoritative contributors4/3/2/1 →10/8/5/3. BEFORE MAX: the same full attack packet sum `<= mechanic.maximumDamage`, fixed7.

That sum includes primary final-number damage; Rogue solo-lowest SET5, Berserker +1, Twins base/augment bonus, Martial combo; engraving indexed by FINAL_NUMBER; armor/penetration/monster penalties; owned BEFORE_DAMAGE changes and queued follow-ups; Imp changes; gunner remaining physical-card Burst damage and aug248 component; Ghost/Martial/Twins extra components; new Prophet aug172/177 collision-derived packets. DOT is applied later and is outside this quantity. Overkill packet damage is included, not capped to remaining monster HP. Defense and all packet modifiers are already applied. Packet class/augment metadata is not added twice. Exact source: combat DAMAGE_BUILD → packets → totalDamage → recordMonsterDamageBatch; baseDamageForCharacter and derivedProphetPackets.

AFTER MAX: `sum(finalNumber for cards if final valid) <= {4:8,3:7,2:5,1:3}[getPatternContributors(run).length]`. The existing contributor selector includes stunned auto-submissions and excludes DOWNED/canSubmitCard=false. Collision-invalid cards are excluded; Knight-final-VALID cards included. SELF_MODIFY/swap/steal FINAL_NUMBER is used. Damage bonuses, engravings, derived/Burst/extra packets excluded. MIN, HP290, cadence, base actions and failure damage1 unchanged.

Presentation: 만월 · 이번 턴 총 피해 N 이상 / 신월 · 유효 카드 숫자 합 N 이하. No new central UI.

## Diagnostic AI policy

The diagnostic decision layer applies only to Moon. A pure selector receives monster ID, public phase/threshold, owner seat, public teammate cycle numbers and prevalidated owner candidates. It never receives other selected cards, other private card IDs/zones, Prophet revealed hidden selections or future RNG. Public collision risk=sum(other public pool frequency for final number). MIN sorts collision risk first, capped useful damage second, cost third. MAX sorts final number +2×collision risk, then risk/cost/seat diversification. Mage legal costs/directions are enumerated using actual validation/self-modification. Vampire unknown swaps are not assigned a hidden exact target number; only the existing legal baseline exchange can be retained. All non-Mage baseline legal skill intents are preserved. Vampire baseline swaps with unknown received number are retained unchanged. Gunner estimates include own remaining Burst cards; Knight protection removes owner collision risk. This is a diagnostic AI candidate, not proof of optimal play. Helped/Hurt not causally evaluated; candidate rank reported.

Prophet uses new Revelation/Fragment semantics (no old prediction/recovery payload). Immediate Fragment requires enough actual resource, no armed/pending Fragment, a physical zero card and another living player. Vampire uses the new owner mark/core rules. These are AI legality guards, no gameplay numbers changed.

## Experiment design

Targeted: four arms ×250 =1000 final encounters, each125 legal controlled MID/full-HP builds +125 expedition-like entries. All boss sample manifests exactly equal across arms: same party/build IDs/profiles/HP/Flame/growth/seed. Classes13/augments390/monsters36. Expedition-like entries use the same47 empirical PR35 entries, cyclic resampling, correlated rather than125 independent samples.

Class migration for empirical entries only: old Prophet BASE printed5 physical instance becomes0, preserving card ID; new combat resource initial state for Prophet/Vampire replaces obsolete resources/framework state. HP/Flame/growth/augment IDs/relics/engravings and other classes are preserved. This is explicitly a migrated empirical cohort, not falsely called an exact old-class snapshot. Class migration records=37.

Early invalid diagnostics were discarded. CONTROL/MOON_ONLY repaired three deterministic seeds with identical original builds/profiles. AI_ONLY/BOTH reran all250 after preserving legal baseline non-number skills and guarding physical zero. Final errors0. Other earlier failures were oracle illegal-swap combinations, now rejected as nonlegal witnesses, and solo Fragment AI attempts, now guarded. Runtime core is not silently rewritten.

## Targeted results

| Arm | Cohort | Samples | ClearRate | WipeRate | AvgTurns | MINSuccess | MAXSuccess | AvgPatternDamage | AvgBaseActionDamage | AvgDowns | AvgFlameSpent | LegalSolutionMissRate | NoLegalSolutionRate |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CONTROL | CONTROLLED_FRESH | 125 | 1.60% | 98.40% | 18.032 | 48.41% | 50.14% | 7.480 | 9.288 | 7.984 | 4 | 80.12% | 19.88% |
| CONTROL | EXPEDITION_LIKE | 125 | 12.80% | 87.20% | 17.512 | 72.78% | 32.80% | 5.752 | 7.368 | 4.944 | 1.328 | 82.70% | 17.30% |
| AI_ONLY | CONTROLLED_FRESH | 125 | 0.80% | 99.20% | 21.616 | 50.97% | 78.29% | 6.168 | 11.016 | 7.984 | 4 | 72.25% | 27.75% |
| AI_ONLY | EXPEDITION_LIKE | 125 | 9.60% | 90.40% | 19.712 | 78.11% | 53.10% | 4.704 | 8.248 | 5.072 | 1.336 | 81.55% | 18.45% |
| MOON_ONLY | CONTROLLED_FRESH | 125 | 0.80% | 99.20% | 19.040 | 47.51% | 66.06% | 6.784 | 9.768 | 7.992 | 4 | 77.26% | 22.74% |
| MOON_ONLY | EXPEDITION_LIKE | 125 | 24.00% | 76.00% | 18.192 | 70.89% | 52.71% | 4.824 | 7.576 | 4.488 | 1.232 | 89.01% | 10.99% |
| BOTH | CONTROLLED_FRESH | 125 | 1.60% | 98.40% | 22.656 | 49.48% | 91.40% | 5.392 | 11.720 | 7.976 | 4 | 68.63% | 31.37% |
| BOTH | EXPEDITION_LIKE | 125 | 28.80% | 71.20% | 21.160 | 76.69% | 80.93% | 3.176 | 8.720 | 4.432 | 1.216 | 85.79% | 14.21% |

LegalSolutionMissRate/NoLegalSolutionRate denominator=guaranteed classified failed non-killing pattern turns. ACHIEVABLE requires a witness without future RNG draw. Random-dependent witnesses and unresolved randomness are UNKNOWN and excluded from that denominator, reported separately. The oracle exhausts submission skills after the SAME actual immediate actions and fixed auto-submissions; it does not enumerate every possible alternate immediate skill/draw choice. Thus no-legal means no solution within this submission-action scope, not impossibility of every possible player strategy. Collisions/AI_MISPLAY/HAND_STATE_LIMIT are descriptive attribution.

## Growth and pattern identity

MAX expedition-minus-fresh gap: CONTROL -17.34pp; AI_ONLY -25.20pp; MOON_ONLY -13.35pp; BOTH -10.46pp. GROWTH_PUNISHMENT_REDUCED=true for both rule-reworked arms, not eliminated.

Pattern identity: nonzero pattern damage and MIN failures remain. See exact arm metrics and difficultyBands in companion JSON; no automatic retuning.

## Full expeditions — new classes in BOTH arms

Same PR35/PR36 first250 `expedition:0..249` seeds. CONTROL250 rerun +BOTH250 new. AI_ONLY/MOON_ONLY full expeditions not run.

| Arm | Runs | F1Early | F1Clear | F2Enter | F2BossReach | F2Clear | F3Enter | F3BossReach | RUN_CLEAR | Exceptions | TurnCaps | PoolExhaustion |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CONTROL | 250 | 167 | 75 | 75 | 25 | 10 | 10 | 7 | 4 | 0 | 0 | 0 |
| BOTH | 250 | 167 | 75 | 75 | 25 | 11 | 11 | 7 | 4 | 0 | 0 | 0 |

F1Early retains prior definition: survived depth3 (`floorReached>1 or finalDepth>3`). F1 encounter metrics exactly matched by seed (turns/damage/damageTaken/downs/clear), scope leak0.

Conditional bosses: [{"Arm": "CONTROL", "Boss": "f2_moon_eating_witch", "BossReached": 11, "BossCleared": 1, "ConditionalClearRate": 0.09090909090909091, "BossFailure": 10}, {"Arm": "CONTROL", "Boss": "f2_rottenheart_ancient", "BossReached": 14, "BossCleared": 9, "ConditionalClearRate": 0.6428571428571429, "BossFailure": 5}, {"Arm": "BOTH", "Boss": "f2_moon_eating_witch", "BossReached": 11, "BossCleared": 2, "ConditionalClearRate": 0.18181818181818182, "BossFailure": 9}, {"Arm": "BOTH", "Boss": "f2_rottenheart_ancient", "BossReached": 14, "BossCleared": 9, "ConditionalClearRate": 0.6428571428571429, "BossFailure": 5}]. Counts are small; targeted rates are not human/full expedition win rates.

## Recommendation

Review MOON_ONLY and BOTH as diagnostic candidates: expedition-like clears12.8% ->24.0% /28.8%; AI_ONLY9.6% remains below CONTROL. BOTH has longer battles; full RUN_CLEAR stays4/250. No automatic production adoption or retuning.. Final preserved-skill AI results supersede preliminary suppressed-skill diagnostics. Review full-run funnel and correlated targeted cohort together; no strong superiority or production readiness claim.

## Verification / limitations

Baseline full suite2514/2514. Candidate full suite2910/2910; DB dependency connected before final run. No test deleted/relaxed. The existing MAX boundary test is updated to the explicitly changed quantity7/8/9 and uses actual damage99 to prove bonuses do not govern MAX. Focused suite25/25. Static272 files parse and references pass. Tests cover four contributor boundaries, collision/Knight-final-valid inclusion, damage exclusion/modifiers, public-only/deterministic AI and non-Moon unchanged selection.

All36 monster content definitions, HP/mechanics/pattern/cadence are byte-identical to PR36; changed F2 behavior branches only Moon MAX/presentation. Rottenheart and35other definitions untouched. Class changes are the explicitly requested core integration. No browser or Supabase calls.

Report: https://docs.google.com/spreadsheets/d/1XfdZxEvaTOBqTqG1Kblm-HpyQMk-zbgWgkUVevNMoFA/edit
Seven REWORK_005 report tables prepared for Sheets; publication verification is recorded in PR/Sheets. Raw19740 pattern turns and1500 final run rows. No hidden-info access, simulation network attempts0. The class core currently permits a Fragment availability path even if physical zero was shop-replaced; this diagnostic avoids it and records it as a separate class availability audit item rather than inventing new gameplay.

Reproduce offline: `node scripts/pve-rebalance-005-prepare.mjs <checkout> <outside-output>`; `PVE_ARM=CONTROL|AI_ONLY|MOON_ONLY|BOTH`. For old-rule arms replace isolated copy's monster-behavior-f2/adaptive-pattern from exact PR36, keeping new classes. Target `PVE_BOSS_SNAPSHOTS=<PR35 harvest> node simulate.mjs1251boss-only` (separate arguments:125,1,boss-only); full `PVE_EXPEDITION_COUNT=250 node simulate.mjs 0 1 full-only`. Optional PVE_TARGET_INDICES replays exact deterministic indices without altering generated cohort. Instrumentation changes only isolated copies. The runtime hash is b4b869f26ed0d816ec7d193a88d5169293e8dd5ed7b0e1651f2702bd382bbbcd.

Final exact candidate commit and CI status are recorded in PR/Sheets after commit creation.
