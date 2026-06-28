-- Fix a lost-update race on peak_total / current_xp / current_level.
--
-- recompute_user_level() read the profile row, re-summed the categories, then
-- wrote the result back. With no lock on the profile row, two concurrent entries
-- for the SAME user but DIFFERENT pockets each ran their recompute in their own
-- transaction: under READ COMMITTED each saw only its own committed category
-- delta, computed total = old_sum + (its delta), and wrote peak_total. The last
-- committer won and the other deposit's contribution was dropped from the level/
-- XP (pocket balances stayed correct, so money was fine, but the level could be
-- stale and a deserved level-up delayed until the next entry self-healed it).
--
-- Taking `for update` on the profile row at the top serializes recomputes per
-- user: the second one blocks until the first commits, then re-reads the now-
-- committed category sum. Body is otherwise identical to 0003.
create or replace function recompute_user_level(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_base text;
  v_total numeric;
  v_peak numeric;
  v_old_level int;
  v_new_level int;
begin
  select base_currency, peak_total, current_level
    into v_base, v_peak, v_old_level
  from profiles where id = p_user for update;  -- serialize recompute per user
  if v_base is null then return; end if;

  -- total = sum of every pocket's balance converted to the user's base currency
  select coalesce(sum(convert_amount(current_balance, currency, v_base)), 0)
    into v_total
  from categories where user_id = p_user;

  if v_total > v_peak then v_peak := v_total; end if;  -- peak only rises

  select coalesce(max(level), 1) into v_new_level
  from levels where xp_required <= v_peak;

  update profiles
    set peak_total = v_peak, current_xp = v_peak, current_level = v_new_level
  where id = p_user;

  if v_new_level > v_old_level then
    insert into level_up_events (user_id, new_level) values (p_user, v_new_level);
  end if;
end;
$$;

-- create or replace preserves grants, but re-assert the lockdown from 0005 so the
-- engine function is never callable directly via the REST/RPC surface.
revoke execute on function recompute_user_level(uuid) from anon, authenticated, public;
