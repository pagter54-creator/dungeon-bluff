# PVE EVENT-001 inventory and reuse audit

## Existing competitive event flow

The competitive engine accepts one physical card per active player, locks submissions, reveals the cards together, applies number changes (including vampire exchange and imp theft), marks duplicates, then calls `eventResult` from `room-remake.js`. Its 16 event rules use high/low valid cards, valid sums, exact/range/count conditions, and post-result choices. The shared encounter panel, card bar, reveal animation, and room result sheet already present the same flow.

PVE combat already had the canonical number mutation helpers in `pve/number-mutation.js`. EVENT-001 reuses these helpers and the existing character self-modification and collision-immunity functions. Event resolution is in `pve/event-resolution.js`; monster damage, kill checks, and retaliation remain in combat.

## PVE Event inventory

| Event | Before EVENT-001 | After EVENT-001 | Resolution |
| --- | --- | --- | --- |
| `f1_abandoned_camp` / 버려진 야영지 | CHOICE_ONLY | CARD_BASED | Highest valid earns 3 Gold; lowest valid loses 1 HP; all-collide has its own no-reward result. |
| `f1_weathered_shrine` / 풍화된 제단 | CHOICE_ONLY | CARD_BASED | Valid sum at least 10 grants party Flame; otherwise highest valid earns 1 EXP. |

No other PVE `EVENT` definitions are registered in the F1 runtime. The old option metadata remains in these definitions solely for runs saved before EVENT-001; newly entered events expose card submissions.

## Competitive event candidates for EVENT-002

| Rule family | Competitive content IDs |
| --- | --- |
| Valid sum / threshold | `pressure_plate`, `overload_device`, `balance_vault`, `shared_supplies`, `ancient_gate` |
| Highest / lowest valid | `collapsing_bridge`, `greedy_chest`, `humble_chest`, `cursed_safe`, `healing_spring`, `field_clinic`, `suspicious_offer` |
| Unique / collision / number groups | `twin_statues`, `truce_offer` |
| Card-dependent post-result choices | `suspicious_merchant`, `gamblers_altar` |

These competitive definitions are CARD_BASED in their current mode. EVENT-002 can convert their effects and follow-up choices to PVE one event at a time. The PVE inventory has no remaining CHOICE_ONLY, PARTIAL, or PLACEHOLDER definitions for newly created rooms.

## Resolution contract

`eventPrimitives` exposes HIGHEST_VALID, LOWEST_VALID, UNIQUE_VALID, COLLIDED, EXACT_NUMBER, VALID_SUM, VALID_COUNT, ORDER_BY_VALUE, ALL_COLLIDE, NO_COLLISION, ABOVE_THRESHOLD, BELOW_THRESHOLD, BETWEEN, TIED_HIGHEST, and TIED_LOWEST. Rankings use final number then seat/player ID for deterministic ordering. Each definition selects its own all-collide outcome. Card identities and current-cycle state remain private in projected snapshots; revealed numbers and outcomes are public.

The converted events are intentionally modest in effect. EVENT-001 does not port the 16 competitive events or add Floor 2/3 content.
