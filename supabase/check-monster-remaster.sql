select
 (select count(*) from information_schema.columns where table_schema='public' and table_name='game_results' and column_name in ('outcome','payout_percent','raw_score','raw_gold')) as result_columns,
 position('wipeout' in pg_get_functiondef('public.account_session_rewards()'::regprocedure))>0 as wipeout_settlement_enabled,
 position('percent:=case when cleared then 100' in pg_get_functiondef('public.account_session_rewards()'::regprocedure))>0 as stage_multiplier_enabled,
 has_function_privilege('authenticated','public.account_session_rewards()','execute') as client_reward_execution_allowed,
 (select tgenabled from pg_trigger where tgname='account_game_rewards') as reward_trigger,
 exists(select 1 from supabase_migrations.schema_migrations where version='202609210006') as migration_recorded;
