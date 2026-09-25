-- Emergency recovery for a PostgREST PGRST002 schema-cache retry loop.
-- The game requires these existing schemas through the Data API.
alter role authenticator set pgrst.db_schemas = 'public, graphql_public';
notify pgrst, 'reload config';
notify pgrst, 'reload schema';
notify pgrst;
select pg_notification_queue_usage();
