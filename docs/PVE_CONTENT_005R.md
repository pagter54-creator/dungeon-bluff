# PVE CONTENT-005R — canonical augment rule resolution

## Source, method and status

Source order: BETA v0.1 workbook (SHA-256 `53f7b239f25778321b63c5fbdcdab2958114ab60869e81dec6274163bf05d48a`) → immutable CONTENT-005S row import → class rules → number/combat/event pipeline → stress invariants → executable runtime. The 005S JSON files remain untouched. The three `pve-augment-resolution-005[bcd].json` overlays link 1:1 to all 390 stable IDs. The parser and tests merge them without changing IDs, original descriptions, BETA numbers or limits. An overlay value carries its source or global-policy basis; null and `AMB-AUG-<ID>-<TOPIC>` mean unresolved. Auto-classified rows are `SPEC_PARTIAL` even when every field is filled, pending card-level review.

| Classification | Count |
| --- | ---: |
| SPEC_COMPLETE, manually reviewed | 22 |
| SPEC_PARTIAL | 195 |
| SPEC_AMBIGUOUS | 173 |
| Trigger resolved | 358 |
| Condition resolved | 238 |
| Once, reset, persistence, visibility resolved | 390 each |
| Five-room matrix fully resolved | 386 |
| High-risk complete / partial / ambiguous | 22 / 0 / 5 |

The 113 previously flagged condition rows were checked individually: 22 by context, 12 by class rule, 0 by global policy, 79 still ambiguous. The [condition audit](PVE_CONTENT_005R_CONDITION_AUDIT.json) records the evidence. No qualitative word such as “높은”, “일정” or “충분히” was converted into a numeric threshold.

## Global trigger and phase policy

Canonical vocabulary: `ON_ACQUIRE`, `COMBAT_START`, `TURN_START`, `PRE_SELECT`, `ON_SKILL_USE`, `ON_SUBMIT`, `POST_REVEAL`, `PRE_COLLISION`, `POST_COLLISION`, `ON_VALID`, `ON_INVALID`, `PRE_DAMAGE`, `POST_DAMAGE`, `ON_DAMAGE_TAKEN`, `ON_HEAL`, `ON_KILL`, `ON_DOWN`, `ON_RECOVER_CARD`, `ON_DRAW`, `ON_CYCLE_RESET`, `TURN_END`, `COMBAT_END`, `ROOM_END`, `FLOOR_END`, `RUN_END`. `COMBAT_START` and `TURN_END` are already emitted by the Combat engine. Other canonical names are aliases/contracts, not a claim that a corresponding generic emitter is already wired. 005F must add missing hooks at existing boundaries rather than insert speculative game phases.

- “유효 공격/카드 통과” means `ON_VALID` after final number and collision validation. “중복 시” means `POST_COLLISION`. “피해를 줄 때” uses `PRE_DAMAGE` for modifying an outgoing packet and `POST_DAMAGE` when actual damage is required. Incoming mitigation must run before the player damage is applied; `ON_DAMAGE_TAKEN` is after actual HP loss.
- Number order remains BASE_NUMBER → SELF_MODIFY → PRE_COLLISION_SWAP → PRE_COLLISION_STEAL → FINAL_NUMBER → COLLISION_GROUP → COLLISION_RESOLUTION → POST_COLLISION_EFFECTS → VALIDITY → DAMAGE. Same-trigger augment ordering is priority → augmentId → effectId. Current interpreter uses priority → effectId; 005F must add explicit augmentId ordering where relevant.
- `ON_ACQUIRE` occurs within the authoritative choose-augment transaction. Persist a player+augment applied marker and action identity. Reconnect, result read, retry and replay cannot apply it again. It uses `ONCE_PER_RUN_PER_AUGMENT`.
- Several cards legitimately have multiple triggers or different limits per subeffect. Their contract uses arrays or named once scopes; a single guessed trigger/once value would lose meaning.

## Room applicability

The overlay records COMBAT, EVENT, REWARD, SHOP and REST as true/false/null with `SOURCE_EXPLICIT`, `CLASS_RULE`, `GLOBAL_POLICY` or `AMBIGUOUS`. Counts: COMBAT 384 true / 4 unknown; EVENT 41 true / 4 unknown; REWARD 43 true / 4 unknown; SHOP 1 true; REST 0 true.

Event and Reward share number modification, swap, steal, collision, validity and eligible physical-card recovery when the source action is available. Monster damage, kill, boss and combat-end effects remain Combat-only. Reward damage ranking is a room-specific score; it is not monster `actualDamage`. A mixed card can have a shared number component and a Combat-only damage component; `roomComponentNote` names that split. Gold/EXP/Relic/Shop/Rest effects apply only to the source-specified context. The four remaining room cases (`aug-086`, `aug-228`, `aug-230`, `aug-384`) stay null because the source and class action availability do not settle them.

## Once, reset, persistence and visibility

No per-turn/per-combat limit is added when the source has none: `onceScope=NONE`. Explicit turn/cycle/combat/room/floor/run phrases map to the corresponding scope. Class-specific keys preserve the source rather than flattening them: per-shuffle, per-Revelation-use, per-Ghost-Slash, per-monster, per-Eclipse and per-Acrobatics-use. A multi-effect card such as `aug-028` keeps separate once scopes. This is a counter policy, not an invented balance cap.

Owned augment IDs persist for the run. Stateless passive behavior persists with ownership. Temporary damage/status state ends with its combat unless a source or class rule says otherwise; class resources inherit their base lifetime. Ghost Swordsman's base Devour remains run-persistent, except `aug-351` explicitly resets its transformed variant each combat. Gambler deck zones are combat-scoped while unlocked physical cards remain in the run. `resetScope` is separate from persistence; `NOT_APPLICABLE` means no mutable effect state. Internal action markers and recursion counters are SERVER_ONLY; public cooperative resources and marks are PUBLIC; exact Gambler hand/deck/discard and private peeks are OWNER_PRIVATE.

BETA's generic stack cap 3 applies only to a true stack without a card/class-specific cap. It is never applied to unrelated resources. Card-specific 4, 5, 6 or 8 caps from the workbook win. Healing uses HP +1 only where the card/source says so, with max HP unless overridden. Berserker base collision healing still caps at HP 2; `aug-131` allows max HP. Self damage uses actual HP loss and the existing class DOWNED/Flame semantics; `aug-201` ally damage has an unresolved down rule.

## Effect and safety contracts

Current Combat creates each primary damage packet from `baseDamageForCharacter + engraving - enemy defense - monster penalty`, clamps to zero, then applies generic `BEFORE_DAMAGE` effects. Follow-up packets and Full Burst physical-card packets are separate. This differs from a hypothetical “all augments then mitigation” sequence. 005F must preserve the current order, tag ADD versus SET/OVERRIDE versus MULTIPLY, and test any proposed pre-mitigation adapter; no blanket formula rewrite is authorized. Each packet keeps modifier IDs, parent damage event and actualDamage attribution. Reward ranking must gate monster-only damage operations.

Recovery preserves the physical `cardInstanceId`, moves SPENT → REMAINING, and never auto-submits. Carry rootActionId, recoveryChainId, parentEventId and finite chainDepth; source-specific two-card recovery overrides the generic 1-card/cycle guide where explicit. Draw follows each class's card model: standard cycle or Gambler draw pile/hand/discard/vanished. Never implement Gambler draw as spent-card recovery. Delayed effects require scheduledAt, resolveAt, cancelCondition, resetScope, combatEndBehavior, bossDeathBehavior and reconnectBehavior; no defaults are invented for absent card details. Status records sourceAugmentId, ownerId, stacks, cap, appliedAt and expiry/reset. Poison is capped at 3 and `aug-071` consumes one stack after two ally valid attacks.

Gold, EXP and relic opportunities are server-authoritative and action-idempotent. Workbook values override generic BETA economy guidance. `aug-030` leaves duplicate-relic/full-inventory policy unresolved. Base-rule changes use ADD, OVERRIDE, CAP_CHANGE, UNLOCK, REPLACE or MULTIPLY, with the source wording preserved. These policies and [the dependency graph](PVE_CONTENT_005R_DEPENDENCIES.json) permit 005F to implement generic infrastructure while leaving card-specific unknowns blocked.

## Existing 19 executable comparison

The [machine-readable audit](PVE_CONTENT_005R_EXECUTABLE_AUDIT.json) checks each ID. Twelve match the explicit BETA rule and existing class/room availability. Two have value mismatches, one has a trigger mismatch, and six have room mismatches; one card may have two categories. No runtime effect is changed in 005R.

| ID | Card | Findings | Evidence |
| --- | --- | --- | --- |
| aug-001 | 노련한 탐험가 | MISMATCH_ROOM | CARD_VALIDATED and BEFORE_DAMAGE are also emitted in Reward Room, so combat attack bonus can change ranking. |
| aug-031 | 불굴의 기사 | MATCH | Existing handler/config and named regression align with explicit BETA numeric rule; 005F must preserve room gating and source limit. |
| aug-041 | 수호벽 | MISMATCH_ROOM | Guardian Wall rescue handler runs in Combat; shared Reward collision resolution does not invoke it. |
| aug-051 | 압살 기사 | MATCH | Existing handler/config and named regression align with explicit BETA numeric rule; 005F must preserve room gating and source limit. |
| aug-061 | 비열한 일격 | MISMATCH_VALUE, MISMATCH_ROOM | Runtime sets Sneaky to 1 instead of incrementing to max 2; generic damage effect also runs in Reward ranking. |
| aug-091 | 대마도 증폭 | MATCH | Existing handler/config and named regression align with explicit BETA numeric rule; 005F must preserve room gating and source limit. |
| aug-101 | 백마도사 | MISMATCH_ROOM | White Mage collision heal handler runs in Combat; Reward shared collision has no heal handler. |
| aug-111 | 역산술 | MATCH | Existing handler/config and named regression align with explicit BETA numeric rule; 005F must preserve room gating and source limit. |
| aug-121 | 피의 광전 | MATCH | Existing handler/config and named regression align with explicit BETA numeric rule; 005F must preserve room gating and source limit. |
| aug-131 | 불사 투사 | MATCH | Existing handler/config and named regression align with explicit BETA numeric rule; 005F must preserve room gating and source limit. |
| aug-161 | 운명 조작자 | MATCH | Revelation immediate skill is Combat-only in the class action model; ally recovery follows that action and preserves physical card identity. |
| aug-181 | 대담한 슬쩍 | MISMATCH_ROOM | Generic BEFORE_DAMAGE bonus for two successful steals can affect Reward damage ranking. |
| aug-241 | 전탄 난사 | MATCH | Existing handler/config and named regression align with explicit BETA numeric rule; 005F must preserve room gating and source limit. |
| aug-291 | 일격필살 | MATCH | Existing handler/config and named regression align with explicit BETA numeric rule; 005F must preserve room gating and source limit. |
| aug-301 | 완전한 권속 | MISMATCH_VALUE, MISMATCH_ROOM | Runtime clears Dominance then adds 1, preventing stack 2; generic BEFORE_DAMAGE bonus also affects Reward ranking. |
| aug-321 | 수혈 | MISMATCH_TRIGGER | Original source says Blood 4 auto-transfusion; runtime requires an explicit pre-submit skill action. |
| aug-331 | 포식 귀참 | MATCH | Existing handler/config and named regression align with explicit BETA numeric rule; 005F must preserve room gating and source limit. |
| aug-351 | 해방된 귀검 | MATCH | Existing handler/config and named regression align with explicit BETA numeric rule; 005F must preserve room gating and source limit. |
| aug-381 | 공중 곡예 | MATCH | Existing handler/config and named regression align with explicit BETA numeric rule; 005F must preserve room gating and source limit. |

In particular, `aug-061` sets Sneaky to 1 instead of accumulating to 2, `aug-301` clears Dominance before adding 1, and `aug-321` requires a pre-submit skill although the source says automatic Blood 4 transfusion. Reward Room currently emits generic `CARD_VALIDATED` and `BEFORE_DAMAGE` for ranking, which can apply combat-only damage bonuses. Shared Guardian Wall and White Mage collision handlers are absent there.

## Source-meaning conflicts and user choices

Nineteen source rows have an apparent original-effect/BETA-effect meaning conflict; these are not repaired by choosing the higher-priority text silently:

| ID | Card | Conflict |
| --- | --- | --- |
| aug-049 | 불침의 수호자 | Original redirects an ally's next direct damage, but BETA replaces it with flat attack damage. |
| aug-052 | 중갑 돌파 | Original pierces enemy defense, but BETA specifies incoming direct-damage reduction. |
| aug-104 | 전투 축복 | Original buffs the healed ally's next valid attack, but BETA only states HP 1 heal. |
| aug-116 | 보존 법칙 | Original improves next-turn mana recovery, but BETA states HP 1 heal. |
| aug-124 | 전투의 식사 | Original buffs the next HP-cost attack after healing, but BETA only states HP 1 heal. |
| aug-129 | 붉은 기관 | Original stores Blood Vigor on healing and spends it for an attack, but BETA only states HP 1 heal. |
| aug-139 | 난전의 왕 | Original stacks brawl bonuses after alternating heal and damage, but BETA only states HP 1 heal. |
| aug-146 | 피 묻은 미소 | Original converts collision recovery to protection at HP 1, but BETA only states HP 1 heal. |
| aug-153 | 되풀이되는 미래 | Original grants Revelation-cycle bonus when a recovered card succeeds, but BETA only states one card recovery. |
| aug-160 | 이미 본 결말 | Original buffs attack during Revelation and recovered-card turns, but BETA states two-card recovery. |
| aug-162 | 별빛 인도 | Original narrows ally recovery candidates, but BETA only states one card recovery. |
| aug-164 | 축복받은 패 | Original buffs a recovered ally card's next attack, but BETA only states one card recovery. |
| aug-166 | 엇갈린 미래 | Original grants ±1 correction to a recovered card, but BETA only states one card recovery. |
| aug-167 | 공동의 예지 | Original accumulates party support stacks on ally card recovery, but BETA only states one card recovery. |
| aug-237 | 승자의 배당 | Original reduces All In draw penalty after a high-damage contribution, but BETA states HP 1 heal. |
| aug-253 | 침착한 호흡 | Original preserves Precision Shot after collision, but BETA specifies incoming direct-damage reduction. |
| aug-257 | 관통탄 | Original pierces enemy defense, but BETA specifies incoming direct-damage reduction. |
| aug-283 | 깨진 자세 | Original weakens enemy defense, but BETA specifies incoming direct-damage reduction. |
| aug-296 | 파공권 | Original pierces enemy defense, but BETA specifies incoming direct-damage reduction. |

The [decision queue](PVE_CONTENT_005R_DECISIONS.json) has 19 grouped questions covering 191 cards and 213 atomic ambiguity entries. Four groups address source-meaning conflicts; two address high-risk card-specific rules; 13 class groups cover the remaining per-card details. Choosing “defer” keeps the ID and source import but does not make the card executable. Grouping reduces the number of user-facing decisions without pretending one generic answer supplies 79 missing thresholds.

## Class adapters and readiness

- Gambler: preserve physical deck/hand/discard/vanished zones, 6/7 unlock, two-card All In validity and sum damage, next draw penalty and owner-only zone visibility. Per-shuffle keys are distinct from standard cycle keys.
- Gunslinger: separate magazine, Full Burst success/failure, cycle reset, extra use, Heat 0–3 and cooldown. `aug-241` uses 1/2/2/3; `aug-261` cools on an unused turn.
- Ghost Swordsman: base Devour run persistence, Ghost Slash threshold and reactivation, `aug-341` threshold 6, and `aug-351` combat-scoped Devour 6 transformation with 2/4/5/6 cards.
- Vampire: Thrall/Blood/Transfusion are separate. `aug-321` Blood gain +1 on valid attack, cap 6, Blood 4 → HP 1, once per turn, combat reset. `aug-301` gain/consume order remains a card-specific decision.
- Imp: number steal stays PRE_COLLISION_STEAL. Mischief's next valid attack gets +2; repeat steal removes it and deals HP damage 1. Its down handling remains open.
- Twins: parity/flip, Acrobatics cycle reset, recharge and first-valid damage are separate. `aug-390` recovery selector remains open.
- Martial Artist: Combo gain/retain/consume/reset and damage conversion are separate. `aug-291` consumes Combo only on valid Finisher for +2 per consumed stack.
- Poison/status: `aug-071` max 3, apply on solo-lowest valid Rogue attack, tick after every two ally valid attacks, consume one, attribute +2 damage to the source, clear with combat target.
- EXP/Gold: card text controls source and cap; do not apply generic EXP to Event or Gold to Shop refunds. Extra party relic is an opportunity, not an immediate duplicate grant.

The candidate pool remains 130 conceptual pools of three. Batch readiness: 005B 7 complete / 85 partial / 58 ambiguous; 005C 8 / 54 / 58; 005D 7 / 56 / 57. None of the full class batches is ready for all-card implementation. The 22 complete cards can drive narrow vertical checks after 005F.

**READY_FOR_PVE_CONTENT_005F = true for framework work.** Trigger aliases, room gating, counters, persistence, status, recovery, draw/deck, damage ordering, immediate effects and economy idempotency have a concrete framework contract. The 173 ambiguous and 195 partial cards are not authorized for speculative runtime implementation. Existing Floor 1/2/3, 13-class, Full Expedition and stress goldens remain unchanged. CI must pass `npm test`, `npm run check` and `npm run pve:stress:smoke`.
