-- Least-privilege cleanup flagged by the security advisor.
--
-- rls_auto_enable() is a pre-existing EVENT TRIGGER function (it auto-enables RLS
-- on newly created public tables). Event triggers fire as the function owner
-- regardless of grants, so REST roles never need EXECUTE on it. Calling it via
-- /rpc would error anyway (pg_event_trigger_ddl_commands() only works inside an
-- event trigger), but we revoke the grants so it isn't exposed at all.
revoke execute on function public.rls_auto_enable() from anon, authenticated, public;

-- admin_stats() and is_admin() remain EXECUTE-able by `authenticated` ON PURPOSE:
-- admin_stats() self-gates with `if not is_admin() then raise`, and is_admin() is
-- referenced inside RLS policies so the authenticated role must keep EXECUTE.
