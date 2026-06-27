-- Leveling-engine scenario test (run via psql or the Supabase SQL editor).
-- Self-contained: creates a throwaway auth user, asserts the invariants, then
-- deletes it (cascade). Any failed assertion raises and rolls the whole thing
-- back. Success prints the final NOTICE 'ALL ENGINE ASSERTIONS PASSED'.

do $$
declare
  uid uuid := '22222222-2222-2222-2222-222222222222';
  c_idr uuid := gen_random_uuid();
  c_usd uuid := gen_random_uuid();
  v_peak numeric; v_xp numeric; v_level int; v_bal numeric;
  t_before numeric; t_after numeric;
  ok boolean;
begin
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
  values (uid, '00000000-0000-0000-0000-000000000000','authenticated','authenticated','engine-scenario@example.com','x',now(),now());

  insert into categories(id,user_id,name,currency) values (c_idr, uid,'Dana Darurat','IDR');
  insert into categories(id,user_id,name,currency) values (c_usd, uid,'Tabungan USD','USD');

  -- deposits: 1.2M IDR + 100 USD (~1.62M IDR) => ~2.82M total => level 2 (>=1M, <3M)
  insert into entries(user_id,category_id,type,amount) values (uid,c_idr,'deposit',1200000);
  insert into entries(user_id,category_id,type,amount) values (uid,c_usd,'deposit',100);
  select current_level into v_level from profiles where id=uid;
  if v_level <> 2 then raise exception 'deposits: expected level 2, got %', v_level; end if;

  -- overdraft must be rejected; balance unchanged
  ok := false;
  begin
    insert into entries(user_id,category_id,type,amount) values (uid,c_idr,'withdraw',5000000);
  exception when others then
    if sqlerrm like '%tidak cukup%' then ok := true; else raise; end if;
  end;
  if not ok then raise exception 'overdraft was not rejected'; end if;
  select current_balance into v_bal from categories where id=c_idr;
  if v_bal <> 1200000 then raise exception 'overdraft changed balance to %', v_bal; end if;

  -- valid withdraw => total drops, level stays (monotonic peak)
  insert into entries(user_id,category_id,type,amount) values (uid,c_idr,'withdraw',1000000);
  select current_level into v_level from profiles where id=uid;
  if v_level <> 2 then raise exception 'withdraw dropped level to %', v_level; end if;

  -- cross-currency transfer keeps base total constant
  select sum(convert_amount(current_balance,currency,'IDR')) into t_before from categories where user_id=uid;
  insert into entries(user_id,category_id,type,amount,to_category_id) values (uid,c_usd,'transfer',50,c_idr);
  select sum(convert_amount(current_balance,currency,'IDR')) into t_after from categories where user_id=uid;
  if abs(t_before-t_after) > 1 then raise exception 'transfer changed total by %', round(t_before-t_after); end if;

  -- changing base_currency re-denominates peak (no inflation)
  update profiles set base_currency='USD', display_currency='USD' where id=uid;
  select peak_total, current_xp into v_peak, v_xp from profiles where id=uid;
  if v_peak > 1000 then raise exception 'base change did not reconvert peak: %', round(v_peak); end if;
  if v_xp <> v_peak then raise exception 'xp <> peak after base change'; end if;

  delete from auth.users where id=uid;
  raise notice 'ALL ENGINE ASSERTIONS PASSED';
end $$;
