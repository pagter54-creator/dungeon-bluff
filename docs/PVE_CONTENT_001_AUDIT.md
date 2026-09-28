# PVE CONTENT-001 — Floor 1 audit and Floor 2 contracts

Audited against `main` after EVENT-001. `IMPLEMENTED` means the requested behavior is executable, not merely present as metadata. No monster HP, rewards, prices, or stress fixtures were changed in this work.

## Repository map

| Concern | Authoritative location |
| --- | --- |
| Floor 1 monster/event/relic registry | `pve/content-f1.js` |
| Map, vote, room entry | `pve/map.js`, `pve/api.js` |
| Combat, boss clear reward, reset | `pve/combat.js`, `pve/monster.js`, `pve/characters.js`, `pve/resources.js` |
| Event, shop, rest, relic chest | `pve/events.js`, `pve/rooms.js` |
| Augment and relic catalogs | `pve/augment-catalog.js`, `pve/augment-runtime.js`, `pve/relics.js` |
| Private state projection | `pve/projection.js` |
| Shared presentation | `src/app.js`, `src/pve-gameplay-adapter.js`, `src/monster-assets.js` |
| Integration and stress | `tests/pve-014-playtest.test.mjs`, `tests/pve-*.test.mjs`, `scripts/pve-stress.mjs` |

## Floor 1 canonical roster

The IDs below marked `target only` are audit labels, not production registry entries. Missing patterns are deliberately not invented. All four registered monsters are spawnable, use seeded target selection, resolve damage and death, and have a public intent, but their content coverage remains partial. The three existing illustrations are `iron_boar.png`, `cowardly_hunter.png`, and `echo_bat.png`.

| Tier | Canonical monster | ID | Status | Observed gimmick / gap |
| --- | --- | --- | --- | --- |
| Normal | 철갑 멧돼지 | `f1_armored_boar` | PARTIAL | DEFEND 1, charge, random direct hit; existing remaster's distinct valid / damage check is absent. |
| Normal | 비겁한 사냥꾼 | `f1_coward_hunter` | PARTIAL | Charge and random direct hit; no card-dependent hunter targeting or mark. HP-only-like behavior. |
| Normal | 녹슨 발리스타 | `f1_rusty_ballista` (target only) | MISSING | AMB-F1-RUSTY_BALLISTA-PATTERN; HP, asset and behavior absent. |
| Normal | 성문 경비견 | `f1_gate_guard_dog` (target only) | MISSING | AMB-F1-GATE_GUARD_DOG-PATTERN; HP, asset and behavior absent. |
| Normal | 하수도 쥐떼 | `f1_sewer_rat_swarm` (target only) | MISSING | AMB-F1-SEWER_RAT_SWARM-PATTERN; HP, asset and behavior absent. |
| Normal | 묘지 파수병 | `f1_graveyard_sentinel` (target only) | MISSING | AMB-F1-GRAVEYARD_SENTINEL-PATTERN; HP, asset and behavior absent. |
| Normal | 사슬 간수 | `f1_chain_jailer` (target only) | MISSING | AMB-F1-CHAIN_JAILER-PATTERN; HP, asset and behavior absent. |
| Elite | 메아리 박쥐 | `f1_echo_bat` | PARTIAL | Periodic party AOE, but no collision-number pressure from the remaster concept. |
| Elite | 공성대장 | `f1_siege_captain` (target only) | MISSING | AMB-F1-SIEGE_CAPTAIN-PATTERN; HP, asset and behavior absent. |
| Elite | 철종지기 | `f1_iron_bell_keeper` (target only) | MISSING | AMB-F1-IRON_BELL_KEEPER-PATTERN; HP, asset and behavior absent. |
| Boss | 몰락한 성주 | `f1_fallen_lord` | PARTIAL | DEFEND, heal and AOE are executable, but no distinct-valid coordination test; UI maps it to the unrelated Seer art. |
| Boss | 성문 파쇄 거상 | `f1_gatebreaker_colossus` (target only) | MISSING | AMB-F1-GATEBREAKER_COLOSSUS-PATTERN; HP, DPS threshold, countdown and art absent. |

Only 2 normal, 1 elite, and 1 boss are currently in `selectF1Monster`. Its pool cannot spawn the other eight. The 8-depth map always selects the Fallen Lord as boss. The four existing definitions have HP 75/75/120/180; these values remain unchanged. The deterministic integration sample observed 6/10/14 turns for normal/elite/boss, matching the target lengths for the sample only. This is not evidence of balance for the eight missing monsters.

## Room and progression audit

| Content | Status | Evidence and remaining gap |
| --- | --- | --- |
| Event | IMPLEMENTED for the two F1 entries | Both use card submission, shared number pipeline, collision, physical-card spend, result and `ROOM_RESULT`; reconnect projection and shared overlay have tests. No placeholder F1 event remains. |
| Shop | IMPLEMENTED for current stock | Authoritative stock is **4 cards + 4 relics**: 2 GENERAL + 2 SHOP_EXCLUSIVE. Shared stock, gold deduction, reservation/cancel/20-second expiry, replacement, duplicate relic rejection and optimistic concurrent commit have tests. Gambler restriction exists but Gambler is not a supported PVE character. |
| Rest | IMPLEMENTED | Independent choices, full heal, capped party Flame and number-value engraving have tests; no physical slot binding. |
| Reward Room | PARTIAL | Four-card chest and 3-attempt all-collision rules, damage-ranked picks and leftovers exist. CONTENT-001 now reuses the event number pipeline and carries physical-card cycles across rooms. More real-party reconnect/choice-order coverage remains. |
| Augment | PARTIAL | Thresholds 50/150/350/750 and authoritative choice exist. Most of the 390 catalog entries have metadata only. CONTENT-001 filters offers to executable entries; some classes consequently see fewer than three choices and no higher-tier offer. A full three-choice runtime pool remains future content. |
| Relic | IMPLEMENTED for exposed F1 pool | Six GENERAL and two SHOP_EXCLUSIVE relics all have runtime effects; reward and shop draw only this pool. The proposed 40-relic catalog is not exposed. |
| Boss clear reward | IMPLEMENTED for current boss | Flame +1, ceil(half missing HP) recovery with minimum 1 and max-HP cap; tests cover it. |
| Floor 1 → Floor 2 | MISSING / BLOCKER | Boss ends at `FLOOR_CLEAR`; no action initializes Floor 2 or advances the same run. Floor 2 combat content and assets are not production-ready, so a generic replacement map must not be exposed. |
| Reconnect | PARTIAL | Combat, event, shop maintenance, reward private projection and augment offer have targeted tests. A full phase-by-phase reconnect route including Floor 2 does not exist. |
| Run resources / reset | PARTIAL | HP, gold, pool, engraving, relics, augments, EXP and score live on the run players. Resource registry marks Devour RUN, while the transformed Demon Swordsman branch intentionally resets it on release according to the locked T02 fixture; this exception needs canonical clarification before Floor 2. Combat-scoped resources are cleared by `clearCombatResources`. Floor transition persistence cannot be proven until that transition exists. |

The current full-route API test covers Normal → Event → Shop → Elite → Rest → Normal → Reward → Boss and ends at `FLOOR_CLEAR`. It does not cover Floor 2. Shop stock count matches the current 4+4 UI, so no stock-size mismatch was found. No balance number was changed.

## Floor 2 design roster and assets

These are design targets only; none are registered as PVE combat content. Older competitive assets are identified without treating them as implemented PVE monsters.

| Tier | Name | Proposed ID | Asset | Existing design note |
| --- | --- | --- | --- | --- |
| Normal | 저주받은 예언자 | `f2_cursed_prophet` | `monster/Cursed_Prophet.png` | Competitive parity curse exists; PVE contract needed. |
| Normal | 굶주린 슬라임 | `f2_hungry_slime` | `monster/Starving_Slime.png` | Competitive lowest-card devour exists; PVE contract needed. |
| Normal | 포자 시종 | `f2_spore_acolyte` | MISSING_ASSET | No design note found. |
| Normal | 늪지 흡혈충 | `f2_swamp_leech` | MISSING_ASSET | No design note found. |
| Normal | 균사 도플갱어 | `f2_mycelial_doppelganger` | MISSING_ASSET | No design note found. |
| Normal | 늪불 등불지기 | `f2_will_o_wisp_keeper` | MISSING_ASSET | No design note found. |
| Normal | 가시 드라이어드 | `f2_thorn_dryad` | MISSING_ASSET | No design note found. |
| Elite | 혼돈 고블린 | `f2_chaos_goblin` | `monster/Chaos_Goblin.png` | Competitive forced random card exists; PVE contract needed. |
| Elite | 뿌리턱 히드라 | `f2_rootjaw_hydra` | MISSING_ASSET | No design note found. |
| Elite | 실타래 마녀 | `f2_thread_witch` | MISSING_ASSET | No design note found. |
| Boss | 썩은심장 고목 | `f2_rottenheart_tree` | MISSING_ASSET | Repeated personal number → corruption stacks. |
| Boss | 달을 삼킨 마녀 | `f2_moon_eater_witch` | MISSING_ASSET | Alternating minimum and maximum party-damage checks. |

## Boss runtime contracts

**썩은심장 고목:** a dedicated handler must receive the post-mutation final number for each relevant player at the existing validity/damage boundary. Store `lastNumberByPlayer`, compare per player, then update `corruptionStacks` through a generic stack primitive. Publish only each player's public stack/countdown and the rule/threshold needed for a decision. The definition must specify whether invalid/collided cards count, stack threshold, penalty, reset, and timing before the handler becomes production content. Do not infer those values from this contract.

**달을 삼킨 마녀:** keep a `phase` alternating between minimum and maximum party damage. At damage-batch completion compare `totalDamage` with the configured threshold for the current phase, resolve the outcome at turn end, then advance phase. Publish mode, comparator, threshold, current-turn progress, and next switch countdown. The damage thresholds, failure consequences, and initial phase require canonical design data.

The pure `monster-primitives.js` module provides repeated-number tracking, bounded stack changes, inclusive minimum/maximum damage checks, phase rotation, and countdown ticking. It does not register either boss, invent a damage value, or change combat ordering. Tests cover these primitives independently.

## Monster effect primitive coverage

| Family | Supported | Partial / missing |
| --- | --- | --- |
| Damage | Single target, party-wide | Multi-selected target set: MISSING |
| Target | Explicit player ID, seeded random living, seat-order fallback | Lowest/highest HP or score: MISSING |
| Timing | Turn start, reveal/number pipeline, after damage monster intent, turn end, cyclic pattern | Explicit countdown action: PARTIAL (pure primitive only) |
| State | Defense, self-heal; pure stack/phase primitives | Runtime status application, persistent phase and status cleanup: MISSING |
| Player interaction | Damage, collision/validity, final number, valid count in event pipeline | Monster-specific exact/repeated number hooks: PARTIAL (pure tracking only) |
| Party calculation | Total damage batch; pure min/max checks | Monster handler for thresholds and valid sum: MISSING |
| Telegraph | Next intent text and seeded target seat | Public boss threshold, countdown, progress and status icon: MISSING |

Combat order is the existing `COMBAT_PHASES` spine in `pve/model.js`: turn start → intent publish → selection → self-modify → swap → steal → reveal → collision → validity → damage build/batch → kill check → monster action → down resolve → turn end. The new pure primitives do not insert a new phase or use random time/client values.

## Blockers and warnings for CONTENT-002

- **BLOCKER:** Eight canonical Floor 1 monsters, including the DPS-check boss, are absent. HP/pattern data for them are unspecified; do not fill with generic monsters or guessed numbers.
- **BLOCKER:** Fallen Lord lacks its distinct-valid test; Hunter lacks a card-dependent gimmick. The existing boss presentation uses unrelated Seer art.
- **BLOCKER:** Floor 1 boss clear does not transition the same run to Floor 2. Floor 2 runtime and nine of twelve illustrations are absent.
- **HIGH:** Reward Room has a shared number pipeline after this change, but its complete character/choice/reconnect matrix still needs coverage.
- **HIGH:** Executable augment coverage is too small for a three-card offer for most characters and has no executable later tiers. Offers are now restricted to executable choices instead of displaying inert content.
- **AMBIGUITY:** `devour` is registered as RUN-scoped, but T02 F22 locks reset-on-release for `aug-351`. The stress fixture was preserved; clarify whether Floor 2 should retain Devour after that transformation ends.
- **BALANCE_WARNING:** The single deterministic route meets the 6/10/14 turn targets; there is no roster-wide distribution to evaluate. No balance patch was made.

`READY_FOR_PVE_CONTENT_002 = false` until the Floor 1 roster, boss mechanics, Floor 2 transition, and production asset/content gates above are resolved. Human browser smoke was omitted at the user's request; the API integration and stress suites provide automated evidence only.
