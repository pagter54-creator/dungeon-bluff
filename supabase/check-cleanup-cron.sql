-- Inspect only; neither query mutates player accounts.
select jobid,jobname,schedule,active from cron.job where jobname='dungeon-bluff-cleanup-guests';
select status,start_time,end_time,return_message from cron.job_run_details
where jobid in (select jobid from cron.job where jobname='dungeon-bluff-cleanup-guests')
order by start_time desc limit 10;
