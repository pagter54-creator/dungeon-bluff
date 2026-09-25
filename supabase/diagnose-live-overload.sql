select now() as captured_at, stats_reset from pg_stat_statements_info;

select pid, usename, application_name, client_addr, state, wait_event_type, wait_event,
       now()-query_start as query_age, now()-xact_start as transaction_age,
       left(regexp_replace(query, '\s+', ' ', 'g'), 500) as query
from pg_stat_activity
where datname=current_database() and pid<>pg_backend_pid()
order by query_start nulls last;

select calls, round(total_exec_time::numeric,2) total_ms,
       round(mean_exec_time::numeric,3) mean_ms,
       left(regexp_replace(query, '\s+', ' ', 'g'), 500) as query
from pg_stat_statements
order by calls desc
limit 30;

select calls, round(total_exec_time::numeric,2) total_ms,
       round(mean_exec_time::numeric,3) mean_ms,
       left(regexp_replace(query, '\s+', ' ', 'g'), 500) as query
from pg_stat_statements
order by total_exec_time desc
limit 30;

select jobid, schedule, command, active from cron.job order by jobid;
