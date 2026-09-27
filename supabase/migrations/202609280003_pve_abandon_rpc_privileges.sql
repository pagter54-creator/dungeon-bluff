begin;

-- Trigger execution does not require client EXECUTE privilege on the trigger
-- function. Block direct PostgREST/RPC invocation and keep service-role access
-- for server-side maintenance only.
revoke execute on function public.pve_abandon_closed_room() from public, anon, authenticated;
grant execute on function public.pve_abandon_closed_room() to service_role;

commit;
