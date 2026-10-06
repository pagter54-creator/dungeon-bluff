-- Operational bootstrap, deliberately outside migrations/automatic deployment.
-- Depends on 202609210004_account_cosmetics.sql's account_cleanup_guests RPC.
-- Existing installations retain their schedule/active state during releases.
-- Install explicitly for a new environment only; re-running updates this named job.
create extension if not exists pg_cron;
select cron.schedule('dungeon-bluff-cleanup-guests','*/5 * * * *',
  'select public.account_cleanup_guests();');
