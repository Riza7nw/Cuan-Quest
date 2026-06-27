-- Security hardening based on Supabase advisors.

-- Pin search_path on the remaining function (no table access, so empty is fine).
create or replace function app_pivot_currency() returns text
language sql immutable set search_path = '' as $$ select 'EUR'::text $$;

-- Internal trigger/engine functions must NOT be callable via the REST rpc
-- endpoint. Triggers still fire (they run as the table owner), and internal
-- PERFORM calls run inside SECURITY DEFINER functions owned by postgres, so
-- revoking EXECUTE from anon/authenticated/public does not affect the engine.
revoke execute on function recompute_user_level(uuid) from anon, authenticated, public;
revoke execute on function fn_entries_apply() from anon, authenticated, public;
revoke execute on function fn_categories_recompute() from anon, authenticated, public;
revoke execute on function fn_profiles_recompute() from anon, authenticated, public;
revoke execute on function fn_handle_new_user() from anon, authenticated, public;
revoke execute on function fn_guard_category() from anon, authenticated, public;
revoke execute on function fn_guard_profile() from anon, authenticated, public;
revoke execute on function fn_lock_currency() from anon, authenticated, public;

-- is_admin() is referenced inside RLS policies, so authenticated must keep
-- EXECUTE; only remove anon/public exposure.
revoke execute on function is_admin() from anon, public;
grant execute on function is_admin() to authenticated;
