-- CuanQuest initial schema.

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  base_currency text not null default 'IDR',
  display_currency text not null default 'IDR',
  peak_total numeric not null default 0,
  current_xp numeric not null default 0,
  current_level int not null default 1,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  icon text,
  currency text not null,
  current_balance numeric not null default 0,  -- maintained by entry triggers
  created_at timestamptz not null default now()
);
create index idx_categories_user on categories(user_id);

create table entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  category_id uuid not null references categories(id) on delete cascade,
  type text not null check (type in ('deposit','withdraw','transfer')),
  amount numeric not null check (amount > 0),
  to_category_id uuid references categories(id) on delete cascade,
  note text,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint transfer_target check (
    (type = 'transfer' and to_category_id is not null and to_category_id <> category_id)
    or (type <> 'transfer' and to_category_id is null)
  )
);
create index idx_entries_user_time on entries(user_id, occurred_at desc);
create index idx_entries_category on entries(category_id);

create table levels (
  level int primary key,
  xp_required numeric not null,
  title text not null,
  badge_icon text
);

create table currencies (
  code text primary key,
  name text not null,
  symbol text not null,
  is_active boolean not null default true
);

create table exchange_rates (
  base_code text not null,
  quote_code text not null,
  rate numeric not null,
  fetched_at timestamptz not null default now(),
  primary key (base_code, quote_code)
);

create table level_up_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  new_level int not null,
  created_at timestamptz not null default now()
);
create index idx_levelup_user_time on level_up_events(user_id, created_at desc);
