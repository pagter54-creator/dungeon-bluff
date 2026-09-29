# PVE CONTENT-003 — Floor 3 vertical slice

Floor 3 defines seven Normal, three Elite, and two Boss encounters at the 160/280/420 HP baseline. Its ten-room generated route supports Normal → Event → Normal → Elite → Rest → Shop → Normal → Reward → Elite → Boss. Existing Event, Shop, Rest, Reward, Augment, and Relic implementations are reused.

The Abyss King publicly tracks recent highest valid number, valid attack count, and damage band. It has one learned response at a time, capped at three stacks; changing strategy for two turns reduces the stack. The Masked Queen publishes exactly one of four masks before card selection and switches every two turns, or every turn below half HP. Monster effects use final modified numbers and collision validity.

Defeating the Floor 3 Boss gives the established combat rewards and enters RUN_CLEAR without creating another map. The existing authoritative `pve_settle_rewards` function reads server-owned runGold, pays once, and changes no RP. RUN_FAILED and ABANDONED retain zero payout. A simultaneous Boss kill and full party wipe at Flame 0 remains RUN_FAILED.

Artwork: `monster/Mimic_of_Greed.png` and `monster/Executioner_Golem.png` are connected. The other ten Floor 3 species are **MISSING_ASSET**. No unrelated placeholder is shown.

The full-route integration fixture controls HP and monster HP to test wiring; it is not a survival or balance result. Natural fresh-party telemetry is recorded separately. No stress golden or fixture changes, schema changes, competitive changes, or production deployment are included.
