-- ============================================================
-- CuanQuest leveling engine: currency conversion, pocket-balance
-- maintenance, and monotonic ("never decreases") leveling.
-- ============================================================

-- Pivot currency for cross-rate math (Frankfurter's base).
create or replace function app_pivot_currency() returns text
language sql immutable as $$ select 'EUR'::text $$;

-- Rate pivot -> code. The pivot itself is 1.
create or replace function get_rate(p_code text) returns numeric
language sql stable set search_path = public as $$
  select case
    when p_code = app_pivot_currency() then 1::numeric
    else (select rate from exchange_rates
          where base_code = app_pivot_currency() and quote_code = p_code)
  end
$$;

-- Convert an amount between currencies via the pivot cross-rate.
-- Returns 0 if a needed rate is missing (never corrupts a total with NULL).
create or replace function convert_amount(p_amount numeric, p_from text, p_to text)
returns numeric language plpgsql stable set search_path = public as $$
declare r_from numeric; r_to numeric;
begin
  if p_amount is null then return 0; end if;
  if p_from = p_to then return p_amount; end if;
  r_from := get_rate(p_from);
  r_to := get_rate(p_to);
  if r_from is null or r_to is null or r_from = 0 then return 0; end if;
  return p_amount * r_to / r_from;
end;
$$;

-- Recompute a user's level from the running total of all pockets.
-- current_xp = peak_total (monotonic): withdrawals lower the total but never
-- the peak, so the level never decreases. Thresholds are data-driven (levels).
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
  from profiles where id = p_user;
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

-- Apply an entry's effect to pocket balance(s), then recompute the level.
-- transfer credits the destination with the converted amount, so the base-
-- currency total stays constant (transfers are level-neutral).
create or replace function fn_entries_apply() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_from text; v_to text; v_credit numeric;
begin
  if NEW.type = 'deposit' then
    update categories set current_balance = current_balance + NEW.amount
      where id = NEW.category_id;
  elsif NEW.type = 'withdraw' then
    update categories set current_balance = current_balance - NEW.amount
      where id = NEW.category_id;
  elsif NEW.type = 'transfer' then
    select currency into v_from from categories where id = NEW.category_id;
    select currency into v_to from categories where id = NEW.to_category_id;
    v_credit := convert_amount(NEW.amount, v_from, v_to);
    update categories set current_balance = current_balance - NEW.amount
      where id = NEW.category_id;
    update categories set current_balance = current_balance + v_credit
      where id = NEW.to_category_id;
  end if;
  perform recompute_user_level(NEW.user_id);
  return NEW;
end;
$$;

create trigger trg_entries_apply
after insert on entries
for each row execute function fn_entries_apply();

-- Recompute when a pocket's currency changes or a pocket is deleted.
create or replace function fn_categories_recompute() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform recompute_user_level(coalesce(NEW.user_id, OLD.user_id));
  return coalesce(NEW, OLD);
end;
$$;

create trigger trg_categories_currency
after update on categories
for each row when (old.currency is distinct from new.currency)
execute function fn_categories_recompute();

create trigger trg_categories_delete
after delete on categories
for each row execute function fn_categories_recompute();

-- Recompute if the user's base currency changes (set at onboarding).
create or replace function fn_profiles_recompute() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform recompute_user_level(NEW.id);
  return NEW;
end;
$$;

create trigger trg_profiles_base
after update on profiles
for each row when (old.base_currency is distinct from new.base_currency)
execute function fn_profiles_recompute();

-- A pocket's currency cannot change once it holds money or has entries.
create or replace function fn_lock_currency() returns trigger
language plpgsql set search_path = public as $$
begin
  if NEW.currency is distinct from OLD.currency then
    if OLD.current_balance <> 0
       or exists (select 1 from entries where category_id = OLD.id) then
      raise exception 'Cannot change the currency of a non-empty pocket';
    end if;
  end if;
  return NEW;
end;
$$;
create trigger trg_lock_currency before update on categories
for each row execute function fn_lock_currency();

-- Integrity guards: end-users (PostgREST role "authenticated") may NOT set
-- system-managed columns. Definer functions (owner) and service_role/postgres
-- run as a different role and bypass these resets.
create or replace function fn_guard_category() returns trigger
language plpgsql set search_path = public as $$
begin
  if current_user = 'authenticated' then
    if TG_OP = 'INSERT' then
      NEW.current_balance := 0;                    -- new pockets start at 0
    else
      NEW.current_balance := OLD.current_balance;  -- balance changes only via entries
    end if;
  end if;
  return NEW;
end;
$$;
create trigger trg_guard_category before insert or update on categories
for each row execute function fn_guard_category();

create or replace function fn_guard_profile() returns trigger
language plpgsql set search_path = public as $$
begin
  if current_user = 'authenticated' then
    NEW.peak_total := OLD.peak_total;
    NEW.current_xp := OLD.current_xp;
    NEW.current_level := OLD.current_level;
    NEW.is_admin := OLD.is_admin;                  -- no self-promotion
  end if;
  return NEW;
end;
$$;
create trigger trg_guard_profile before update on profiles
for each row execute function fn_guard_profile();

-- Auto-create a profile row when a new auth user signs up.
create or replace function fn_handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id) values (NEW.id) on conflict (id) do nothing;
  return NEW;
end;
$$;
create trigger trg_on_auth_user_created
after insert on auth.users
for each row execute function fn_handle_new_user();
