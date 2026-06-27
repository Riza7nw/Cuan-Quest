-- Integrity fixes from the Phase 1 adversarial review.

-- (#1, #7) Currencies must be known codes. Closes the "unrated currency"
-- holes: pockets/profiles can only reference a real currency row.
alter table categories
  add constraint categories_currency_fk
  foreign key (currency) references currencies(code);
alter table profiles
  add constraint profiles_base_currency_fk
  foreign key (base_currency) references currencies(code);
alter table profiles
  add constraint profiles_display_currency_fk
  foreign key (display_currency) references currencies(code);

-- (#5) Pocket balances can never go negative.
alter table categories
  add constraint categories_balance_nonneg check (current_balance >= 0);

-- (#1, #5) Rebuild the entry-apply trigger with overdraft + missing-rate guards.
create or replace function fn_entries_apply() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_from text; v_to text; v_credit numeric; v_src numeric;
begin
  if NEW.type = 'deposit' then
    update categories set current_balance = current_balance + NEW.amount
      where id = NEW.category_id;

  elsif NEW.type = 'withdraw' then
    select current_balance into v_src from categories where id = NEW.category_id for update;
    if v_src < NEW.amount then
      raise exception 'Saldo kantong tidak cukup' using errcode = 'check_violation';
    end if;
    update categories set current_balance = current_balance - NEW.amount
      where id = NEW.category_id;

  elsif NEW.type = 'transfer' then
    select currency, current_balance into v_from, v_src
      from categories where id = NEW.category_id for update;
    select currency into v_to from categories where id = NEW.to_category_id;
    if v_src < NEW.amount then
      raise exception 'Saldo kantong tidak cukup' using errcode = 'check_violation';
    end if;
    v_credit := convert_amount(NEW.amount, v_from, v_to);
    -- Never silently destroy money: a missing rate must abort the transfer.
    if v_credit = 0 and NEW.amount <> 0 then
      raise exception 'Kurs % -> % tidak tersedia', v_from, v_to using errcode = 'check_violation';
    end if;
    update categories set current_balance = current_balance - NEW.amount
      where id = NEW.category_id;
    update categories set current_balance = current_balance + v_credit
      where id = NEW.to_category_id;
  end if;

  perform recompute_user_level(NEW.user_id);
  return NEW;
end;
$$;

-- (#2, #4) When base_currency changes, re-denominate the stored peak/xp into the
-- new base so the monotonic peak and the (base-denominated) level thresholds
-- stay in the same currency. Runs as definer, so the guard trigger won't reset it.
create or replace function fn_profiles_recompute() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update profiles
    set peak_total = convert_amount(peak_total, OLD.base_currency, NEW.base_currency),
        current_xp = convert_amount(current_xp, OLD.base_currency, NEW.base_currency)
  where id = NEW.id;
  perform recompute_user_level(NEW.id);
  return NEW;
end;
$$;
