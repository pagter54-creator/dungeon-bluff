# PVE BETA-001 Production Release

## Canonical migration chain

Production PVE BETA-001 requires exactly:

1. `202609270001_pve_core.sql`
2. `202609270002_pve_hardening_telemetry.sql`
3. `202609280001_game_modes_pve_beta.sql`
4. `202609280002_pve_beta_reward_canonical.sql`

The machine-readable source of truth is `deploy/pve-beta-production-release.json`. Future migrations are not implicitly allowed.

## Dependency

- 270001 creates `pve_runs`, `pve_actions` and initial PVE snapshot RPCs.
- 270002 depends on them, adds `pve_telemetry`, and replaces PVE commit/read/create RPCs.
- 280001 directly references `pve_runs` and `pve_telemetry`, adds `rooms.game_mode`, PVE entry/reward objects and the runtime kill switch.
- 280002 depends on 280001 `pve_results` and replaces abandonment/reward settlement.

Therefore the 27-series migrations are mandatory production prerequisites.

## Kill switch

The authoritative switch is `public.pve_runtime_flags.COOP_PVE_ENABLED`, seeded `false` by 280001.

Enable only after DB/API deployment and competitive smoke:

```sql
update public.pve_runtime_flags
set enabled=true,updated_at=now()
where flag_key='COOP_PVE_ENABLED';
```

Emergency OFF uses the same statement with `enabled=false`.

When OFF, new COOP_PVE create/start is rejected with `COOP_PVE_TEMPORARILY_DISABLED`. Existing runs continue. Competitive mode is unaffected.

## Required sequence

1. Full CI success.
2. Verify production project identity and schema drift CLEAN.
3. `npm run pve:production:preflight` reports `READY_TO_APPLY` and exactly the four manifest migrations.
4. Apply those migrations in timestamp order.
5. Recheck migration history/schema; keep switch OFF.
6. Deploy current `game-api`.
7. Competitive remote smoke.
8. Merge PR #1 and publish frontend using the existing production path.
9. Verify PVE disabled UI.
10. Enable switch.
11. PVE create/list/join/reconnect/start → `pve_runs` → `MAP_VOTE`; then first combat smoke.
12. Confirm competitive RP unchanged.

Stop before DB apply for schema drift PARTIAL/CONFLICT, project mismatch, pending-set mismatch, destructive table/data operations, incompatible existing rows, or non-green CI. Do not use migration repair or force only the 28-series migrations.
