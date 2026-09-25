-- Install after 202609210004_account_cosmetics.sql. Re-running updates this named job.
create extension if not exists pg_cron;
select cron.schedule('dungeon-bluff-cleanup-guests','*/5 * * * *',
  'select public.account_cleanup_guests();');
