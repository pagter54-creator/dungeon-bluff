select
 to_regprocedure('public.game_try_commit(jsonb,jsonb,jsonb,jsonb,bigint,text,jsonb)') is not null as conflict_safe_commit_available,
 has_function_privilege('authenticated','public.game_try_commit(jsonb,jsonb,jsonb,jsonb,bigint,text,jsonb)','execute') as client_direct_commit_allowed,
 has_function_privilege('service_role','public.game_try_commit(jsonb,jsonb,jsonb,jsonb,bigint,text,jsonb)','execute') as server_commit_allowed,
 exists(select 1 from supabase_migrations.schema_migrations where version='202609220001') as migration_recorded;
