# Supabase production outage report — 2026-09-22

## Project

- Name: `dungeon bluff`
- Reference: `lktjmuhbfnahdghidqfa`
- Region: `ap-northeast-1` (Tokyo)
- Runtime: `supabase-postgres-17.6.1.166` (`ga`, latest available)
- Public site: `https://pagter54-creator.github.io/dungeon-bluff/`

## User impact

Players cannot connect to the game. The client repeatedly attempts to reconnect and ultimately fails. Auth and Data API requests return Cloudflare HTTP 521 or PostgREST schema-cache failures.

## Current service health

- `auth`: `UNHEALTHY`; Cloudflare HTTP 521 `origin_down`
- `rest`: `UNHEALTHY`; `Failed to retrieve project's rest service health`
- `db`: `ACTIVE_HEALTHY`
- `db_postgres_user`: `ACTIVE_HEALTHY`
- `pooler`: `ACTIVE_HEALTHY`
- `storage`: `ACTIVE_HEALTHY`
- `pg_bouncer`: `ACTIVE_HEALTHY`
- `realtime`: reported `ACTIVE_HEALTHY`, but `db_connected=false` and `replication_connected=false`

The management API reports the overall project as `ACTIVE_HEALTHY`, although Auth and REST remain unhealthy.

## Database findings before restart

- No blocking or long-running queries were present.
- Connection counts were below limits.
- A PostgREST `set_config(...)` statement increased by tens of thousands of calls per minute while game RPC counters stayed unchanged.
- Game and account Edge Functions returned `Could not query the database for the schema cache. Retrying.`
- Direct database connections remained available.

## Recovery actions already attempted

1. Sent PostgREST schema and config reload notifications.
2. Explicitly set `authenticator` `pgrst.db_schemas` to `public, graphql_public`.
3. Temporarily raised the `authenticator` statement timeout from 8 seconds to 60 seconds, tested, then restored it to 8 seconds.
4. Restarted the project twice through `POST /v1/projects/lktjmuhbfnahdghidqfa/restart`; both calls returned HTTP 200.
5. Re-applied Auth settings with email auto-confirm and anonymous users enabled.
6. Re-applied PostgREST schemas `public,graphql_public` and extra search path `public,extensions`.
7. Waited beyond the 120-second retry period and rechecked service health.
8. Attempted to pause the project twice so it could be restored. Both attempts failed before pausing because Supabase could not verify backup status.

No data deletion or restoration was performed.

## Management API errors

Pause attempt 1:

- HTTP 500: `Failed to verify backup status before pausing`
- Error event ID: `d89b571885df4604bb2f15f955971659`

Pause attempt 2, after waiting more than 120 seconds:

- HTTP 500: `Failed to verify backup status before pausing`
- Error event ID: `8394d441fb294fbd9bf9c31cd997eed4`

Latest Auth health error:

- HTTP 521 `origin_down`
- Cloudflare message says the origin refuses connections and requires owner action.

## Requested Supabase action

Please repair or recreate the Auth and PostgREST origins for this project and correct the backup-status verification failure that prevents pause/restore. Please also verify Realtime's database and replication connections. The database itself is reachable and healthy.
