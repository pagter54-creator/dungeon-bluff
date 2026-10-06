# PVE BETA-001 Production Release

## Canonical migration chain

Production PVE BETA-001 requires exactly:

1. `202609270001_pve_core.sql`
2. `202609270002_pve_hardening_telemetry.sql`
3. `202609280001_game_modes_pve_beta.sql`
4. `202609280002_pve_beta_reward_canonical.sql`

The initial release manifest is `deploy/pve-beta-production-release.json`. It records these four prerequisites and the post-release privilege migration. General main deployments now use the pending-migration safety guard described in [AUTO_DEPLOYMENT.md](AUTO_DEPLOYMENT.md); subsequent non-destructive migrations are not restricted to this historical four-file manifest.

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

1. Complete work and required local/PR checks; PR validation never deploys production.
2. Reflect validated changes in main.
3. Main GitHub Actions reruns tests/static checks, verifies project identity and dry-run safety, applies pending migrations, then deploys all Edge Functions.
4. The same run publishes the validated frontend to Pages after backend success.
5. Keep the existing kill-switch value unchanged by deployment. Initial installation still seeds it OFF.
6. When needed, explicitly run production competitive smoke. **It creates real anonymous accounts, rooms and game state; it is never an ordinary deployment step.**
7. For initial PVE enablement only, verify disabled UI/backend, then explicitly manage the switch using the existing operational procedure.
8. Explicit PVE smoke verifies create/list/join/reconnect/start → `pve_runs` → `MAP_VOTE` and unchanged competitive RP. First combat/browser verification remains separate.

Stop before DB apply for migration-history/schema conflicts, project mismatch, destructive or unclassified migration operations, incompatible existing rows, or non-green checks. Do not use migration repair or force only the 28-series migrations. The old exact-four production preflight remains an initial-release diagnostic, not a generic auto-deployment command.
