-- Temporary recovery headroom while PostgREST rebuilds its schema cache.
alter role authenticator set statement_timeout = '60s';
notify pgrst, 'reload config';
notify pgrst, 'reload schema';
notify pgrst;
select pg_notification_queue_usage();
