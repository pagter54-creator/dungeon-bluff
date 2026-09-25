select jsonb_build_object(
  'roles',(select jsonb_agg(jsonb_build_object('role',rolname,'config',rolconfig) order by rolname)
    from pg_roles where rolname in ('authenticator','anon','authenticated','service_role')),
  'schemas',(select jsonb_agg(nspname order by nspname) from pg_namespace),
  'notification_queue_usage',pg_notification_queue_usage(),
  'session_db_schemas',current_setting('pgrst.db_schemas', true)
) as diagnosis;
