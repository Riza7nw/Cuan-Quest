-- Admin dashboard aggregates. SECURITY DEFINER so it can read across all users,
-- but gated by is_admin() — a non-admin rpc('admin_stats') call raises, not leaks.
-- This is why the admin UI needs no service-role key: the session client suffices.

create or replace function admin_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = public as $$
declare result jsonb;
begin
  if not is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'users', (select count(*) from profiles),
    'admins', (select count(*) from profiles where is_admin),
    'pockets', (select count(*) from categories),
    'entries', (select count(*) from entries),
    'level_ups', (select count(*) from level_up_events),
    'currencies_active', (select count(*) from currencies where is_active),
    'currencies_total', (select count(*) from currencies),
    'rates_last_fetched', (select max(fetched_at) from exchange_rates),
    'level_distribution', (
      select coalesce(jsonb_object_agg(level::text, n), '{}'::jsonb)
      from (
        select current_level as level, count(*) as n
        from profiles group by current_level order by current_level
      ) d
    )
  ) into result;

  return result;
end;
$$;

-- REST exposure: authenticated may call (the function self-gates); never anon/public.
revoke execute on function admin_stats() from anon, public;
grant execute on function admin_stats() to authenticated;
