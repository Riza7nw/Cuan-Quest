-- Edit / delete an entry. Done as SECURITY DEFINER RPCs (not AFTER UPDATE/DELETE
-- triggers) on purpose: a trigger would also fire on the ON DELETE CASCADE when a
-- category is removed, double-reversing balances mid-delete. An explicit RPC the
-- server action calls keeps the reversal under our control and self-authorizes via
-- auth.uid(). Balance writes must be definer-owned anyway (fn_guard_category
-- freezes current_balance for the authenticated role).
--
-- Money exactness: deposits/withdrawals and same-currency transfers reverse
-- exactly. A cross-currency transfer reverses its destination credit at CURRENT
-- rates, so deleting one long after the rate moved can leave a sub-unit residue in
-- the destination pocket (rare; the level stays correct since recompute re-sums
-- balances). Transfer EDITS are therefore restricted to note/date (no amount),
-- which makes edits always exact.

-- Delete an entry owned by the caller, reversing its balance effect.
create or replace function delete_entry(p_entry uuid)
returns void language plpgsql security definer set search_path = public as $$
declare e entries; v_from text; v_to text; v_credit numeric;
begin
  select * into e from entries where id = p_entry and user_id = auth.uid();
  if not found then
    raise exception 'Entri tidak ditemukan' using errcode = 'no_data_found';
  end if;

  if e.type = 'deposit' then
    update categories set current_balance = current_balance - e.amount
      where id = e.category_id;
  elsif e.type = 'withdraw' then
    update categories set current_balance = current_balance + e.amount
      where id = e.category_id;
  elsif e.type = 'transfer' then
    select currency into v_from from categories where id = e.category_id;
    select currency into v_to from categories where id = e.to_category_id;
    v_credit := convert_amount(e.amount, v_from, v_to);
    update categories set current_balance = current_balance + e.amount
      where id = e.category_id;
    update categories set current_balance = current_balance - v_credit
      where id = e.to_category_id;
  end if;

  delete from entries where id = p_entry;
  perform recompute_user_level(e.user_id);
end;
$$;

-- Edit an entry owned by the caller. For deposit/withdraw: reverse the old amount
-- and apply the new one (overdraft-checked), plus note/date. For transfer: only
-- note/date (amount/pockets are immutable to avoid cross-rate drift).
create or replace function update_entry(
  p_entry uuid,
  p_amount numeric default null,
  p_note text default null,
  p_occurred_at timestamptz default null
)
returns void language plpgsql security definer set search_path = public as $$
declare e entries; v_src numeric;
begin
  select * into e from entries where id = p_entry and user_id = auth.uid();
  if not found then
    raise exception 'Entri tidak ditemukan' using errcode = 'no_data_found';
  end if;

  if e.type = 'transfer' then
    update entries
      set note = p_note, occurred_at = coalesce(p_occurred_at, occurred_at)
      where id = p_entry;
    return;
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Jumlah harus lebih dari 0' using errcode = 'check_violation';
  end if;

  -- reverse the old effect
  if e.type = 'deposit' then
    update categories set current_balance = current_balance - e.amount
      where id = e.category_id;
  else
    update categories set current_balance = current_balance + e.amount
      where id = e.category_id;
  end if;

  -- apply the new effect
  if e.type = 'deposit' then
    update categories set current_balance = current_balance + p_amount
      where id = e.category_id;
  else
    select current_balance into v_src from categories
      where id = e.category_id for update;
    if v_src < p_amount then
      raise exception 'Saldo kantong tidak cukup' using errcode = 'check_violation';
    end if;
    update categories set current_balance = current_balance - p_amount
      where id = e.category_id;
  end if;

  update entries
    set amount = p_amount,
        note = p_note,
        occurred_at = coalesce(p_occurred_at, occurred_at)
    where id = p_entry;
  perform recompute_user_level(e.user_id);
end;
$$;

-- Only signed-in users may call these; each self-checks user_id = auth.uid().
revoke execute on function delete_entry(uuid) from anon, public;
revoke execute on function update_entry(uuid, numeric, text, timestamptz) from anon, public;
grant execute on function delete_entry(uuid) to authenticated;
grant execute on function update_entry(uuid, numeric, text, timestamptz) to authenticated;