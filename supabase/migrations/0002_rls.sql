-- Row Level Security: enabled on every table from day one.

alter table profiles enable row level security;
alter table categories enable row level security;
alter table entries enable row level security;
alter table level_up_events enable row level security;
alter table levels enable row level security;
alter table currencies enable row level security;
alter table exchange_rates enable row level security;

-- Helper: is the current user an admin? Definer to avoid RLS recursion on profiles.
create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from profiles where id = auth.uid()), false)
$$;

-- profiles: each user sees/updates only their own row. No client INSERT
-- (the signup trigger creates it). Sensitive columns are protected by a
-- guard trigger (0003), not column grants.
create policy profiles_select on profiles for select to authenticated
  using (id = auth.uid());
create policy profiles_update on profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- categories: owner-scoped CRUD.
create policy categories_select on categories for select to authenticated
  using (user_id = auth.uid());
create policy categories_insert on categories for insert to authenticated
  with check (user_id = auth.uid());
create policy categories_update on categories for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy categories_delete on categories for delete to authenticated
  using (user_id = auth.uid());

-- entries: append-only (SELECT + INSERT). INSERT must reference the user's
-- OWN pockets, so nobody can poke another user's pocket via the balance trigger.
create policy entries_select on entries for select to authenticated
  using (user_id = auth.uid());
create policy entries_insert on entries for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from categories c
                where c.id = category_id and c.user_id = auth.uid())
    and (
      to_category_id is null
      or exists (select 1 from categories c2
                 where c2.id = to_category_id and c2.user_id = auth.uid())
    )
  );

-- level_up_events: read own; rows are inserted by the definer recompute function.
create policy levelup_select on level_up_events for select to authenticated
  using (user_id = auth.uid());

-- Global config: any authenticated user reads; only admins write.
create policy levels_select on levels for select to authenticated using (true);
create policy levels_write on levels for all to authenticated
  using (is_admin()) with check (is_admin());
create policy currencies_select on currencies for select to authenticated using (true);
create policy currencies_write on currencies for all to authenticated
  using (is_admin()) with check (is_admin());
create policy rates_select on exchange_rates for select to authenticated using (true);
create policy rates_write on exchange_rates for all to authenticated
  using (is_admin()) with check (is_admin());
