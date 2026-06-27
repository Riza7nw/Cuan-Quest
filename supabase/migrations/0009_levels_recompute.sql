-- Fix: editing the level ladder must recompute every user's denormalized level.
--
-- profiles.current_level/current_xp are maintained by recompute_user_level(),
-- which previously fired only on entry/category/base_currency changes — NOT when
-- the levels table itself changed. So an admin editing a threshold (or deleting a
-- tier) left every user with a stale level until their next entry, and a deleted
-- tier could silently drop a user's level on that next entry with no event.
--
-- We make the ladder authoritative: any write to `levels` recomputes all users in
-- the same transaction. The "level never decreases" invariant is about USER
-- actions (withdrawals never lower the peak); an admin reshaping the ladder is an
-- explicit reconfiguration, so recomputing to the new ladder is the correct result
-- and matches what the delete dialog already promises the admin.

create or replace function recompute_all_users()
returns void language plpgsql security definer set search_path = public as $$
declare r record;
begin
  for r in select id from profiles loop
    perform recompute_user_level(r.id);
  end loop;
end;
$$;

-- Statement-level (fires once per ladder change, not once per affected row).
-- SECURITY DEFINER → runs as owner, so recompute_user_level's profile UPDATE
-- bypasses the authenticated-only guard trigger and actually persists.
create or replace function fn_levels_recompute()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform recompute_all_users();
  return null;
end;
$$;

drop trigger if exists trg_levels_recompute on levels;
create trigger trg_levels_recompute
after insert or update or delete on levels
for each statement execute function fn_levels_recompute();

-- Internal engine functions: never callable via the REST rpc endpoint.
revoke execute on function recompute_all_users() from anon, authenticated, public;
revoke execute on function fn_levels_recompute() from anon, authenticated, public;
