# PVE CONTENT-001C — Stress reference isolation and reconnect gate

## Six original failures

| Failing test | Seed / first divergence | Expected | Actual before isolation | Dependency |
| --- | --- | --- | --- | --- |
| T04 semantic golden | `smoke:T04:0000`, `collisionTimeline[0][4][0][9]` (first recorded turn, p0 damage) | 5 | 4 | Stress comparison used the production iron boar; its new Armor reduced damage. |
| T06 F1–F26 coverage | `unit-t06-recovery`, first boss comparison kill; same root reproduced at `smoke:T06:0000`, boss turn 26 | p0 card pool partition available | `INVALID_CARD_ZONE_PARTITION`: pool 5 cards, remaining/spent empty because the Floor 2 transition removed combat state | Stress recovery comparison used the production boss and a synthetic map. |
| T06 golden fingerprint | `smoke:T06:0000`, boss turn 26 | fingerprint `02255d6e67b9fd912432921ba5800ef21068008f22be1c3afcf3b5c95b5f4e4c` | `INVALID_CARD_ZONE_PARTITION` before fingerprint production | Same T06 boss boundary. |
| T06 recovery metrics | `unit-t06-recovery`, first boss comparison kill | finite recovery metrics | `INVALID_CARD_ZONE_PARTITION` before metrics production | Same T06 boss boundary. |
| T09 semantic golden | `smoke:T09:0000`, `resourceTimeline.rows[55][6]`, turn 15 p0 Warrior resource after | 0 | 1 | Long-running resource stress used the production iron boar cadence and HP. |
| T14 boundary golden | `golden-t14-seed`, `cases[0].monsterHp`, first Flame-1 lethal fixture | 65 | 82 | Boundary fixture defaulted to the production iron boar HP and Armor. |

The route was `stress scenario → makeCombatRun / comparison encounter → F1_MONSTER_DEFINITIONS → newCombatState → publishMonsterIntent → resolveBasicTurn`. The stress runner also selected current Floor 1 monsters in T02, T03, and T06. These scenarios exercise class interactions, card cycles, resources, and Flame boundaries; they do not assert the latest production monster rules. The Floor 1 content suite does assert those rules.

## Isolation

`scripts/pve-stress-reference-monsters.mjs` owns immutable 75 / 120 / 180 HP reference inputs and the pre-CONTENT-001B attack cadence. Stress scenario runners import them instead of the mutable Floor 1 registry. The production monster registry remains at 90 / 160 / 240 with all twelve mechanics active.

`newCombatState` records a supplied intent pattern for executable production mechanics and explicit reference inputs. `publishMonsterIntent` uses that recorded pattern, so a reference encounter sharing an old monster ID cannot accidentally load the current production pattern. Synthetic stress encounters without a generated floor map stop at `FLOOR_CLEAR`; real map runs advance to Floor 2. Both paths use the same combat, number, damage, character, and down-resolution pipeline. A dedicated test checks that the reference encounter passes through those production phases.

No existing stress fixture, golden, scenario policy, or warning threshold was changed.

## API boundary

The full four-human API route now reaches the boss, forces a due augment at the boss boundary, chooses it through `pve.chooseAugment`, and commits Floor 2 MAP under the same run ID. It reads persisted state through `pve.getState` for all four users, compares permanent resources and cards with the committed state, and verifies each viewer receives only their own saved card cycle. A Floor 2 vote returns `CONTENT_NOT_IMPLEMENTED` with no commit or resource/map mutation.

## Verification

- Local full suite: 466/466 pass.
- `node scripts/check.mjs`: pass.
- Actual Windows stress smoke: 8 scenarios, 10 seeds each, 0 hard failures. The stress CLI entrypoint was made cross-platform so Windows no longer exits without executing.
- T04, T06, T09, T14 focused tests: pass.
- T04, T06, T09, T14 100-seed runs: 0 hard failures; existing balance warnings remain.
- Production Floor 1 roster, boss boundaries, and full route tests: pass.
- GitHub Project Checks: pending verification on PR #7 HEAD.

Balance warnings at 90 / 160 / 240 HP and nine missing monster illustrations remain separate content follow-ups. No HP, gimmick, or art changes were made in CONTENT-001C.
