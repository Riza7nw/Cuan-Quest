# CuanQuest MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-ready MVP of CuanQuest — a gamified savings tracker where users level up (RPG-style) by growing the TOTAL of self-named savings pockets, converted to a base currency, with a level that never decreases.

**Architecture:** DB-authoritative. All money math + leveling + currency conversion live in Postgres (triggers + functions). Next.js Server Actions only validate (zod) and orchestrate, writing via the user's RLS-scoped session. Service-role key is used only by the cron rate-refresh route.

**Tech Stack:** Next.js 14 (App Router) + TypeScript (strict) · Tailwind + shadcn/ui · Supabase (Postgres 17, Auth, RLS) · `@supabase/ssr` · zod · Recharts · Vitest · Vercel.

## Global Constraints

- TypeScript **strict mode** on; no `any` in committed code.
- Supabase project: `zlqsjumjzgbuoaehomtb` (ap-southeast-2). Apply each migration via Supabase MCP **and** save the identical SQL under `supabase/migrations/`.
- RLS enabled on **every** table from the first migration. Explicit policy per operation.
- `SUPABASE_SERVICE_ROLE_KEY` server-only — never imported into a client component.
- Leveling thresholds are **data-driven** from the `levels` table — never hardcode level numbers in app code.
- All money stored in its **original currency**; never overwrite with a converted value.
- Every entry amount `> 0`; `transfer` requires `to_category_id` present and `<> category_id` (enforced by zod AND DB CHECK).
- Entries are **append-only** in MVP (no edit/delete of entries; corrections via compensating entry).
- UI copy in Indonesian; code identifiers + comments in English. Leveling logic must be commented.
- App name everywhere: **CuanQuest**.
- Pivot currency for cross-rates: **EUR** (Frankfurter base).
- Default `base_currency` at signup/onboarding: **IDR**.

---

## PHASE 1 — Fondasi (Foundation)

### Task 1.1: Scaffold Next.js app

**Files:** Create project files in repo root (`app/`, `package.json`, `tsconfig.json`, etc.).

- [ ] **Step 1:** Run scaffold (root already has `.git`, `.gitignore`, `docs/` — all allowlisted by create-next-app):
```bash
npx create-next-app@latest . --ts --tailwind --eslint --app --src-dir=false --import-alias "@/*" --use-npm --no-turbopack
```
Accept defaults if prompted. If it complains about a conflicting file, the offender is a stray file in root — move it into `docs/`.
- [ ] **Step 2:** Set strict TS — confirm `tsconfig.json` has `"strict": true` (create-next-app sets it). Set package name: in `package.json` set `"name": "cuanquest"`.
- [ ] **Step 3:** Verify dev server boots: `npm run dev` → open http://localhost:3000 → default page renders. Stop server.
- [ ] **Step 4:** Commit.
```bash
git add -A && git commit -m "chore: scaffold Next.js 14 app (TS strict, Tailwind, App Router)"
```

### Task 1.2: Install deps + init shadcn/ui

**Files:** `package.json`, `components.json`, `components/ui/*`.

- [ ] **Step 1:** Install runtime + dev deps:
```bash
npm i @supabase/ssr @supabase/supabase-js zod recharts date-fns lucide-react
npm i -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom
```
- [ ] **Step 2:** Init shadcn/ui:
```bash
npx shadcn@latest init -d
```
- [ ] **Step 3:** Add components used across app:
```bash
npx shadcn@latest add button input label card dialog tabs select badge sonner dropdown-menu table skeleton progress alert-dialog switch
```
- [ ] **Step 4:** Configure Vitest. Create `vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: { environment: "jsdom", globals: true, setupFiles: ["./vitest.setup.ts"] },
  resolve: { alias: { "@": path.resolve(__dirname, ".") } },
});
```
Create `vitest.setup.ts`:
```ts
import "@testing-library/jest-dom/vitest";
```
Add to `package.json` scripts: `"test": "vitest run"`, `"test:watch": "vitest"`.
- [ ] **Step 5:** Verify: `npm test` (no tests yet → exits 0 "no test files"). Commit.
```bash
git add -A && git commit -m "chore: add deps, shadcn/ui components, vitest config"
```

### Task 1.3: Supabase clients + env

**Files:** Create `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/admin.ts`, `.env.example`, `.env.local` (gitignored).

**Interfaces — Produces:**
- `createClient()` (browser) from `lib/supabase/client.ts`
- `createClient()` (server, async) from `lib/supabase/server.ts`
- `createAdminClient()` from `lib/supabase/admin.ts` (server-only)

- [ ] **Step 1:** Fetch real values via MCP (`get_project_url`, `get_publishable_keys` for project `zlqsjumjzgbuoaehomtb`). Write `.env.local` with real URL + publishable (anon) key. Ask user for `SUPABASE_SERVICE_ROLE_KEY` (Supabase dashboard → Project Settings → API). Set `CRON_SECRET` to a random string.
- [ ] **Step 2:** `.env.example` (placeholders, committed):
```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-publishable-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-server-only
CRON_SECRET=a-long-random-string
```
- [ ] **Step 3:** `lib/supabase/client.ts`:
```ts
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```
- [ ] **Step 4:** `lib/supabase/server.ts`:
```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options));
          } catch { /* called from a Server Component; middleware refreshes */ }
        },
      },
    }
  );
}
```
- [ ] **Step 5:** `lib/supabase/admin.ts`:
```ts
import "server-only";
import { createClient as createSb } from "@supabase/supabase-js";

export function createAdminClient() {
  return createSb(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
```
- [ ] **Step 6:** Commit.
```bash
git add -A && git commit -m "feat: supabase ssr clients + env scaffolding"
```

### Task 1.4: Migration 0001 — tables

**Files:** Create `supabase/migrations/0001_init.sql`. Apply via MCP `apply_migration` (name `init_schema`).

- [ ] **Step 1:** Write `0001_init.sql`:
```sql
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
  current_balance numeric not null default 0,
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
```
- [ ] **Step 2:** Apply via MCP `apply_migration`. Verify with MCP `list_tables` → 7 tables present.
- [ ] **Step 3:** Commit the SQL file.
```bash
git add supabase/migrations/0001_init.sql && git commit -m "feat(db): initial schema (0001)"
```

### Task 1.5: Migration 0002 — RLS policies

**Files:** Create `supabase/migrations/0002_rls.sql`. Apply via MCP (name `rls_policies`).

- [ ] **Step 1:** Write `0002_rls.sql`:
```sql
alter table profiles enable row level security;
alter table categories enable row level security;
alter table entries enable row level security;
alter table level_up_events enable row level security;
alter table levels enable row level security;
alter table currencies enable row level security;
alter table exchange_rates enable row level security;

-- profiles: owner = id
create policy profiles_select on profiles for select using (id = auth.uid());
create policy profiles_update on profiles for update using (id = auth.uid()) with check (id = auth.uid());
-- (insert handled by signup trigger; no client insert)

-- helper: is current user admin
create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from profiles where id = auth.uid()), false)
$$;

-- categories
create policy categories_select on categories for select using (user_id = auth.uid());
create policy categories_insert on categories for insert with check (user_id = auth.uid());
create policy categories_update on categories for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy categories_delete on categories for delete using (user_id = auth.uid());

-- entries (append-only: select + insert only)
create policy entries_select on entries for select using (user_id = auth.uid());
create policy entries_insert on entries for insert with check (user_id = auth.uid());

-- level_up_events (read own; inserts done by definer trigger)
create policy levelup_select on level_up_events for select using (user_id = auth.uid());

-- global tables: read by any authenticated; write by admin only
create policy levels_select on levels for select to authenticated using (true);
create policy levels_write on levels for all to authenticated using (is_admin()) with check (is_admin());
create policy currencies_select on currencies for select to authenticated using (true);
create policy currencies_write on currencies for all to authenticated using (is_admin()) with check (is_admin());
create policy rates_select on exchange_rates for select to authenticated using (true);
create policy rates_write on exchange_rates for all to authenticated using (is_admin()) with check (is_admin());

-- Integrity: prevent users from directly setting derived columns.
revoke update (current_balance) on categories from authenticated;
revoke update (peak_total, current_xp, current_level) on profiles from authenticated;
```
- [ ] **Step 2:** Apply via MCP. Verify with MCP `get_advisors` (type `security`) → no "RLS disabled" warnings.
- [ ] **Step 3:** Commit.
```bash
git add supabase/migrations/0002_rls.sql && git commit -m "feat(db): RLS policies + derived-column lockdown (0002)"
```

### Task 1.6: Migration 0003 — functions + triggers (CORE)

**Files:** Create `supabase/migrations/0003_functions_triggers.sql`. Apply via MCP (name `leveling_engine`).

**Interfaces — Produces (SQL):** `app_pivot_currency()`, `get_rate(text)`, `convert_amount(numeric,text,text)`, `recompute_user_level(uuid)`, triggers on `entries`/`categories`/`auth.users`.

- [ ] **Step 1:** Write `0003_functions_triggers.sql`:
```sql
-- Pivot currency for cross-rate math (Frankfurter base).
create or replace function app_pivot_currency() returns text
language sql immutable as $$ select 'EUR'::text $$;

-- Rate of pivot -> code. Pivot itself = 1.
create or replace function get_rate(p_code text) returns numeric
language sql stable as $$
  select case
    when p_code = app_pivot_currency() then 1::numeric
    else (select rate from exchange_rates
          where base_code = app_pivot_currency() and quote_code = p_code)
  end
$$;

-- Convert amount from one currency to another via cross-rate.
-- Returns 0 if a needed rate is missing (safe: never corrupts the total with NULL).
create or replace function convert_amount(p_amount numeric, p_from text, p_to text)
returns numeric language plpgsql stable as $$
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

-- === Leveling recompute. Definer so it can write locked-down columns. ===
-- Rule: level is based on the running TOTAL of all pockets (converted to the
-- user's base currency), locked at its all-time peak so it NEVER decreases.
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

  -- total = sum of every pocket's balance converted to base currency
  select coalesce(sum(convert_amount(current_balance, currency, v_base)), 0)
    into v_total
  from categories where user_id = p_user;

  -- peak is monotonic: withdrawals lower total but never the peak (=> never the level)
  if v_total > v_peak then v_peak := v_total; end if;

  -- current_xp = peak_total (baseline 0). Level = highest level whose
  -- xp_required <= xp. Data-driven from the levels table (never hardcoded).
  select coalesce(max(level), 1) into v_new_level
  from levels where xp_required <= v_peak;

  update profiles
    set peak_total = v_peak, current_xp = v_peak, current_level = v_new_level
  where id = p_user;

  -- record a level-up so the UI can celebrate and we keep history
  if v_new_level > v_old_level then
    insert into level_up_events (user_id, new_level) values (p_user, v_new_level);
  end if;
end;
$$;

-- === Apply an entry's effect to pocket balances, then recompute level. ===
-- deposit: +amount to category. withdraw: -amount. transfer: -amount from
-- source, +converted amount to destination (keeps base total constant).
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

-- Recompute if base currency changes (set once at onboarding, guarded here).
create trigger trg_profiles_base
after update on profiles
for each row when (old.base_currency is distinct from new.base_currency)
execute function fn_categories_recompute();

-- Guard: a pocket's currency cannot change once it holds money or has entries.
create or replace function fn_lock_currency() returns trigger
language plpgsql as $$
begin
  if NEW.currency is distinct from OLD.currency then
    if OLD.current_balance <> 0
       or exists (select 1 from entries where category_id = OLD.id) then
      raise exception 'Cannot change currency of a non-empty pocket';
    end if;
  end if;
  return NEW;
end;
$$;
create trigger trg_lock_currency before update on categories
for each row execute function fn_lock_currency();

-- Auto-create a profile row on signup.
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
```
- [ ] **Step 2:** Apply via MCP. Verify no errors.
- [ ] **Step 3:** Commit.
```bash
git add supabase/migrations/0003_functions_triggers.sql && git commit -m "feat(db): leveling engine — convert, recompute, triggers (0003)"
```

### Task 1.7: Migration 0004 — seed

**Files:** Create `supabase/migrations/0004_seed.sql`. Apply via MCP (name `seed_data`).

- [ ] **Step 1:** Write `0004_seed.sql`:
```sql
insert into levels (level, xp_required, title) values
  (1, 0, 'Pemula'),
  (2, 1000000, 'Penabung'),
  (3, 3000000, 'Pengumpul'),
  (4, 7000000, 'Pejuang Finansial'),
  (5, 15000000, 'Ahli Cuan'),
  (6, 30000000, 'Sultan Muda'),
  (7, 60000000, 'Hartawan'),
  (8, 120000000, 'Konglomerat'),
  (9, 250000000, 'Taipan'),
  (10, 500000000, 'Legenda')
on conflict (level) do nothing;

insert into currencies (code, name, symbol, is_active) values
  ('IDR','Indonesian Rupiah','Rp', true),
  ('USD','US Dollar','$', true),
  ('EUR','Euro','€', true),
  ('SGD','Singapore Dollar','S$', true),
  ('MYR','Malaysian Ringgit','RM', true),
  ('JPY','Japanese Yen','¥', true),
  ('AUD','Australian Dollar','A$', true),
  ('GBP','British Pound','£', true)
on conflict (code) do nothing;

-- Initial EUR->X snapshot so convert_amount never hits NULL before first cron.
-- Approximate; refreshed daily by /api/cron/rates.
insert into exchange_rates (base_code, quote_code, rate) values
  ('EUR','IDR', 17500),
  ('EUR','USD', 1.08),
  ('EUR','EUR', 1),
  ('EUR','SGD', 1.45),
  ('EUR','MYR', 5.1),
  ('EUR','JPY', 168),
  ('EUR','AUD', 1.63),
  ('EUR','GBP', 0.85)
on conflict (base_code, quote_code) do update set rate = excluded.rate;
```
- [ ] **Step 2:** Apply via MCP. Verify via MCP `execute_sql`: `select count(*) from levels` → 10; `select count(*) from currencies` → 8.
- [ ] **Step 3:** Commit.
```bash
git add supabase/migrations/0004_seed.sql && git commit -m "feat(db): seed levels, currencies, initial rates (0004)"
```

### Task 1.8: Generate DB types

**Files:** Create `lib/database.types.ts`, `lib/types.ts`.

- [ ] **Step 1:** Use MCP `generate_typescript_types` for the project → save output to `lib/database.types.ts`.
- [ ] **Step 2:** `lib/types.ts` — domain aliases:
```ts
import type { Database } from "@/lib/database.types";
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Category = Database["public"]["Tables"]["categories"]["Row"];
export type Entry = Database["public"]["Tables"]["entries"]["Row"];
export type Level = Database["public"]["Tables"]["levels"]["Row"];
export type Currency = Database["public"]["Tables"]["currencies"]["Row"];
export type EntryType = "deposit" | "withdraw" | "transfer";
```
- [ ] **Step 3:** Commit.
```bash
git add -A && git commit -m "feat: generated DB types + domain aliases"
```

### Task 1.9: Leveling display helpers (TDD)

**Files:** Create `lib/leveling.ts`, `lib/leveling.test.ts`.

**Interfaces — Produces:**
- `levelForXp(xp: number, levels: {level:number;xp_required:number}[]): number`
- `progressToNext(xp, levels): { current: Level|null; next: Level|null; pct: number; remaining: number }`

- [ ] **Step 1:** Write failing tests `lib/leveling.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { levelForXp, progressToNext } from "@/lib/leveling";

const L = [
  { level: 1, xp_required: 0, title: "Pemula" },
  { level: 2, xp_required: 1000000, title: "Penabung" },
  { level: 3, xp_required: 3000000, title: "Pengumpul" },
];

describe("levelForXp", () => {
  it("is level 1 at xp 0", () => expect(levelForXp(0, L)).toBe(1));
  it("stays level 1 just below threshold", () => expect(levelForXp(999999, L)).toBe(1));
  it("hits level 2 exactly at threshold", () => expect(levelForXp(1000000, L)).toBe(2));
  it("returns the highest satisfied level", () => expect(levelForXp(5000000, L)).toBe(3));
});

describe("progressToNext", () => {
  it("computes pct + remaining toward next level", () => {
    const p = progressToNext(2000000, L);
    expect(p.current?.level).toBe(2);
    expect(p.next?.level).toBe(3);
    expect(p.remaining).toBe(1000000); // 3,000,000 - 2,000,000
    expect(Math.round(p.pct)).toBe(50); // (2M-1M)/(3M-1M)
  });
  it("caps at 100% at max level", () => {
    const p = progressToNext(9999999, L);
    expect(p.next).toBeNull();
    expect(p.pct).toBe(100);
  });
});
```
- [ ] **Step 2:** Run `npm test` → FAIL (module not found).
- [ ] **Step 3:** Implement `lib/leveling.ts`:
```ts
import type { Level } from "@/lib/types";
type L = Pick<Level, "level" | "xp_required" | "title"> & Partial<Level>;

// Highest level whose xp_required <= xp. Data-driven from the levels table.
export function levelForXp(xp: number, levels: L[]): number {
  const sorted = [...levels].sort((a, b) => a.xp_required - b.xp_required);
  let result = sorted[0]?.level ?? 1;
  for (const l of sorted) if (xp >= l.xp_required) result = l.level;
  return result;
}

export function progressToNext(xp: number, levels: L[]) {
  const sorted = [...levels].sort((a, b) => a.xp_required - b.xp_required);
  const curLevel = levelForXp(xp, sorted);
  const current = sorted.find((l) => l.level === curLevel) ?? null;
  const next = sorted.find((l) => l.level === curLevel + 1) ?? null;
  if (!next) return { current, next: null, pct: 100, remaining: 0 };
  const base = current?.xp_required ?? 0;
  const span = next.xp_required - base;
  const pct = span > 0 ? Math.min(100, ((xp - base) / span) * 100) : 0;
  return { current, next, pct, remaining: Math.max(0, next.xp_required - xp) };
}
```
- [ ] **Step 4:** Run `npm test` → PASS.
- [ ] **Step 5:** Commit.
```bash
git add -A && git commit -m "feat: leveling display helpers + tests"
```

### Task 1.10: Currency helpers (TDD)

**Files:** Create `lib/currency.ts`, `lib/currency.test.ts`.

**Interfaces — Produces:**
- `crossConvert(amount, from, to, ratesFromPivot: Record<string, number>): number`
- `formatMoney(amount, currency, symbol?): string`

- [ ] **Step 1:** Write failing tests `lib/currency.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { crossConvert, formatMoney } from "@/lib/currency";

const rates = { EUR: 1, USD: 1.08, IDR: 17500 }; // pivot EUR

describe("crossConvert", () => {
  it("returns amount when same currency", () => expect(crossConvert(100, "USD", "USD", rates)).toBe(100));
  it("converts USD->IDR via EUR pivot", () => {
    // 100 USD -> EUR (100/1.08) -> IDR (*17500)
    expect(Math.round(crossConvert(100, "USD", "IDR", rates))).toBe(1620370);
  });
  it("returns 0 when a rate is missing", () => expect(crossConvert(100, "USD", "XYZ", rates)).toBe(0));
});

describe("formatMoney", () => {
  it("formats IDR without decimals", () => {
    expect(formatMoney(1500000, "IDR")).toMatch(/1\.500\.000|1,500,000/);
  });
});
```
- [ ] **Step 2:** Run `npm test` → FAIL.
- [ ] **Step 3:** Implement `lib/currency.ts`:
```ts
// Cross-rate conversion mirroring the SQL convert_amount(). Pivot = EUR.
export function crossConvert(
  amount: number, from: string, to: string, ratesFromPivot: Record<string, number>
): number {
  if (from === to) return amount;
  const rFrom = ratesFromPivot[from];
  const rTo = ratesFromPivot[to];
  if (!rFrom || !rTo) return 0;
  return (amount * rTo) / rFrom;
}

const ZERO_DECIMAL = new Set(["IDR", "JPY"]);
export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("id-ID", {
      style: "currency", currency,
      maximumFractionDigits: ZERO_DECIMAL.has(currency) ? 0 : 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString("id-ID")}`;
  }
}
```
- [ ] **Step 4:** Run `npm test` → PASS.
- [ ] **Step 5:** Commit.
```bash
git add -A && git commit -m "feat: currency cross-convert + format helpers + tests"
```

### Task 1.11: zod validation schemas

**Files:** Create `lib/validation/entries.ts`, `lib/validation/categories.ts`, `lib/validation/profile.ts`.

- [ ] **Step 1:** `lib/validation/entries.ts`:
```ts
import { z } from "zod";
export const entrySchema = z.object({
  type: z.enum(["deposit", "withdraw", "transfer"]),
  category_id: z.string().uuid(),
  amount: z.coerce.number().positive(),
  to_category_id: z.string().uuid().nullable().optional(),
  note: z.string().max(280).optional().nullable(),
  occurred_at: z.string().datetime().optional(),
}).refine(
  (d) => d.type !== "transfer" || (!!d.to_category_id && d.to_category_id !== d.category_id),
  { message: "Transfer butuh kantong tujuan yang berbeda", path: ["to_category_id"] }
);
export type EntryInput = z.infer<typeof entrySchema>;
```
- [ ] **Step 2:** `lib/validation/categories.ts`:
```ts
import { z } from "zod";
export const categoryCreateSchema = z.object({
  name: z.string().min(1).max(60),
  currency: z.string().length(3),
  icon: z.string().max(40).optional().nullable(),
});
export const categoryUpdateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(60),
  icon: z.string().max(40).optional().nullable(),
});
```
- [ ] **Step 3:** `lib/validation/profile.ts`:
```ts
import { z } from "zod";
export const onboardingSchema = z.object({ base_currency: z.string().length(3) });
export const settingsSchema = z.object({ display_currency: z.string().length(3) });
```
- [ ] **Step 4:** Commit.
```bash
git add -A && git commit -m "feat: zod validation schemas"
```

### Task 1.12: Auth + middleware

**Files:** Create `app/(auth)/login/page.tsx`, `app/(auth)/signup/page.tsx`, `lib/actions/auth.ts`, `middleware.ts`, `lib/supabase/middleware.ts`.

- [ ] **Step 1:** `lib/supabase/middleware.ts` — session refresh + route gating helper:
```ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options));
        },
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  const isAuthPage = path.startsWith("/login") || path.startsWith("/signup");
  const isPublic = isAuthPage;

  if (!user && !isPublic) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (user && isAuthPage) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  if (path.startsWith("/admin") && user) {
    const { data: profile } = await supabase.from("profiles")
      .select("is_admin").eq("id", user.id).single();
    if (!profile?.is_admin) return NextResponse.redirect(new URL("/", request.url));
  }
  return response;
}
```
- [ ] **Step 2:** `middleware.ts`:
```ts
import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/cron|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
```
- [ ] **Step 3:** `lib/actions/auth.ts` — `signIn`, `signUp`, `signOut` server actions using `lib/supabase/server`. On signUp success redirect to `/onboarding`; on signIn to `/`. Return `{ error }` on failure.
- [ ] **Step 4:** Build `/login` and `/signup` as client forms (shadcn `card`, `input`, `button`, `label`) calling the server actions; show errors via `sonner`. CuanQuest branding header.
- [ ] **Step 5:** Manual verify: signup a test user → lands on `/onboarding`; check MCP `execute_sql` `select count(*) from profiles` increased (signup trigger works). Log out, log in.
- [ ] **Step 6:** Commit.
```bash
git add -A && git commit -m "feat: email/password auth + session middleware + admin gate"
```

### Task 1.13: Onboarding

**Files:** Create `app/onboarding/page.tsx`, extend `lib/actions/profile.ts`.

- [ ] **Step 1:** `lib/actions/profile.ts` → `completeOnboarding(formData)`: zod `onboardingSchema`; update `profiles` set `base_currency` + `display_currency` = chosen; optionally insert first category (name + currency=base). RLS-scoped. Redirect `/`.
- [ ] **Step 2:** `/onboarding` UI: select `base_currency` (from active `currencies`), short explainer "mulai dari 0", optional first pocket name. Submit → action.
- [ ] **Step 3:** Manual verify: complete onboarding → profile.base_currency set; redirected to dashboard (even if empty).
- [ ] **Step 4:** Commit.
```bash
git add -A && git commit -m "feat: onboarding (base currency + optional first pocket)"
```

> **CHECKPOINT — Fase 1.** Report: scaffolding, all 4 migrations applied (verify MCP `get_advisors` security clean), auth + onboarding working, pure-logic tests green. Await review before Fase 2.

---

## PHASE 2 — Core loop (quick-add + leveling + dashboard)

### Task 2.1: Entries server action

**Files:** Create `lib/actions/entries.ts`.

**Interfaces — Produces:** `createEntry(input: EntryInput): Promise<{ ok: true; leveledUp: boolean; newLevel: number; newTitle: string|null } | { ok: false; error: string }>`

- [ ] **Step 1:** Implement `createEntry`:
  - Validate with `entrySchema`.
  - `supabase = await createClient()`; get user; reject if none.
  - Read `profiles.current_level` (before).
  - `insert` into `entries` with `user_id = user.id` (RLS + DB trigger apply the effect).
  - Re-read `profiles` (`current_level`, then join `levels.title`).
  - `leveledUp = after > before`; if so fetch the new title.
  - `revalidatePath("/")` and `revalidatePath("/history")`.
  - Return result object.
- [ ] **Step 2:** Manual/integration verify via the UI in Task 2.3, plus SQL scenario in Task 2.2.
- [ ] **Step 3:** Commit.
```bash
git add -A && git commit -m "feat: createEntry server action (validate + insert + level-up flag)"
```

### Task 2.2: DB scenario test for the leveling engine

**Files:** Create `supabase/tests/leveling_scenario.sql` (run via MCP `execute_sql` in a transaction; rollback at end).

- [ ] **Step 1:** Write a scenario that, for a throwaway user row, exercises: create 2 pockets (IDR + USD), deposit → assert `total`/`peak`/`current_level`; withdraw → assert total drops but level holds; transfer cross-currency → assert base total ~unchanged. Use `do $$ ... $$` with asserts via `raise exception` on mismatch. Wrap in `begin; ... rollback;`.
- [ ] **Step 2:** Run via MCP `execute_sql`. Expected: completes with no exception (all asserts pass).
- [ ] **Step 3:** Commit the SQL test file.
```bash
git add -A && git commit -m "test(db): leveling scenario (deposit/withdraw/transfer invariants)"
```

### Task 2.3: Quick-add form

**Files:** Create `components/quick-add-form.tsx`, `app/(app)/add/page.tsx`.

- [ ] **Step 1:** `add/page.tsx` (server) fetches user's `categories`; passes to client form.
- [ ] **Step 2:** `quick-add-form.tsx` (client): shadcn `tabs` for Setor/Tarik/Pindah (default Setor); large amount input (`inputMode="decimal"`); pocket selection as `button` chips (remember last via `localStorage`); for Pindah show source + destination chips; `occurred_at` defaults now (collapsible date input); submit calls `createEntry`; optimistic toast; on `leveledUp` open `LevelUpDialog`. Disable submit while pending.
- [ ] **Step 3:** Manual verify: deposit to a pocket → dashboard total rises; crossing 1,000,000 IDR triggers level-up dialog.
- [ ] **Step 4:** Commit.
```bash
git add -A && git commit -m "feat: quick-add form (Setor/Tarik/Pindah, optimistic, remembers pocket)"
```

### Task 2.4: Level-up celebration

**Files:** Create `components/level-up-dialog.tsx`.

- [ ] **Step 1:** Dialog (shadcn `dialog`) showing new level number, title, badge, and the next threshold. Lightweight CSS animation (no heavy libs). Props: `{ open, onOpenChange, level, title, nextThreshold }`.
- [ ] **Step 2:** Manual verify: triggered from Task 2.3 flow.
- [ ] **Step 3:** Commit.
```bash
git add -A && git commit -m "feat: level-up celebration dialog"
```

### Task 2.5: Dashboard

**Files:** Create `app/(app)/layout.tsx`, `app/(app)/page.tsx`, `components/level-card.tsx`, `components/xp-progress.tsx`, `components/category-balances.tsx`, `components/recent-entries.tsx`.

- [ ] **Step 1:** `(app)/layout.tsx`: app shell (top bar w/ CuanQuest, nav to add/categories/history/insights/settings, sign-out; admin link if `is_admin`). Fetches profile once.
- [ ] **Step 2:** `(app)/page.tsx` (server): fetch profile, levels, categories, latest rates, recent entries (limit 10). Compute display total via `crossConvert` (base→display) using rates map.
- [ ] **Step 3:** `level-card.tsx` (level number + title + badge), `xp-progress.tsx` (uses `progressToNext`: show current_xp and remaining to next), `category-balances.tsx` (per-pocket balance + its currency), `recent-entries.tsx` (type icon, amount, pocket, time via date-fns).
- [ ] **Step 4:** Manual verify: numbers match DB; display currency conversion correct.
- [ ] **Step 5:** Commit.
```bash
git add -A && git commit -m "feat: dashboard (level card, XP progress, total, balances, recent)"
```

> **CHECKPOINT — Fase 2.** Report: full core loop works (add → trigger → level → celebrate → dashboard reflects). Await review before Fase 3.

---

## PHASE 3 — Remaining pages + admin + cron + docs

### Task 3.1: Categories management

**Files:** Create `app/(app)/categories/page.tsx`, `lib/actions/categories.ts`, `components/category-manager.tsx`.

- [ ] **Step 1:** Actions: `createCategory` (zod), `renameCategory` (zod), `deleteCategory(id)` — delete cascades entries (DB FK), recompute via trigger. All RLS-scoped, `revalidatePath`.
- [ ] **Step 2:** UI: list pockets (name, currency, balance); create (name + currency select); rename inline; delete with `alert-dialog` warning ("kantong & semua entri-nya akan dihapus; level tetap"). Currency only selectable at create.
- [ ] **Step 3:** Manual verify: create/rename/delete; deleting a funded pocket lowers total but level stays.
- [ ] **Step 4:** Commit.
```bash
git add -A && git commit -m "feat: categories management (create/rename/delete + cascade)"
```

### Task 3.2: History

**Files:** Create `app/(app)/history/page.tsx`, `components/history-list.tsx`.

- [ ] **Step 1:** Server page: fetch entries (join category names) ordered by `occurred_at desc`, with optional filters (category, type) via searchParams.
- [ ] **Step 2:** UI: filter chips (type) + pocket select; list rows with type/amount/pocket/note/time. Empty state.
- [ ] **Step 3:** Manual verify: filters narrow results correctly.
- [ ] **Step 4:** Commit.
```bash
git add -A && git commit -m "feat: history page with type/pocket filters"
```

### Task 3.3: Insights

**Files:** Create `app/(app)/insights/page.tsx`, `components/charts/total-over-time.tsx`, `components/charts/composition.tsx`, `lib/insights.ts` (+ `lib/insights.test.ts`).

- [ ] **Step 1 (TDD):** `lib/insights.ts` `buildTotalSeries(entries, categories, ratesFromPivot, base)`: replay entries chronologically, convert each effect to base, produce cumulative `{date,total}[]`. Write tests first (deposit raises series; withdraw lowers; transfer neutral in base), run FAIL.
- [ ] **Step 2:** Implement until tests PASS.
- [ ] **Step 3:** Charts: `total-over-time.tsx` (Recharts `AreaChart`), `composition.tsx` (per-pocket share, `PieChart`/bar). Page fetches data, converts, renders. Keep light.
- [ ] **Step 4:** Manual verify: chart shapes match activity.
- [ ] **Step 5:** Commit.
```bash
git add -A && git commit -m "feat: insights (total-over-time + composition) + series tests"
```

### Task 3.4: Settings

**Files:** Create `app/(app)/settings/page.tsx`, extend `lib/actions/profile.ts`.

- [ ] **Step 1:** Action `updateDisplayCurrency` (zod `settingsSchema`). Show base currency read-only (set at onboarding), editable display currency, sign-out.
- [ ] **Step 2:** Manual verify: changing display currency reformats dashboard total.
- [ ] **Step 3:** Commit.
```bash
git add -A && git commit -m "feat: settings (display currency, profile)"
```

### Task 3.5: Admin — levels CRUD

**Files:** Create `app/(app)/admin/layout.tsx`, `app/(app)/admin/page.tsx`, `app/(app)/admin/levels/page.tsx`, `lib/actions/admin.ts`.

- [ ] **Step 1:** `admin/layout.tsx`: server-side re-check `is_admin` (defense in depth beyond middleware); 403 redirect otherwise.
- [ ] **Step 2:** Actions `upsertLevel`, `deleteLevel` (RLS admin policy enforces). Levels table editor (level, xp_required, title, badge). After edit, note recompute affects future entries; optional: trigger recompute for current user.
- [ ] **Step 3:** Manual verify (promote test user via MCP `execute_sql` `update profiles set is_admin=true where ...`): edit a threshold, confirm persisted.
- [ ] **Step 4:** Commit.
```bash
git add -A && git commit -m "feat(admin): data-driven levels CRUD"
```

### Task 3.6: Admin — currencies + manual rate refresh

**Files:** Create `app/(app)/admin/currencies/page.tsx`, extend `lib/actions/admin.ts`.

- [ ] **Step 1:** Toggle `currencies.is_active`; button to POST `/api/cron/rates` (with secret) for manual refresh; show `exchange_rates.fetched_at`.
- [ ] **Step 2:** Commit.
```bash
git add -A && git commit -m "feat(admin): currency management + manual rate refresh"
```

### Task 3.7: Admin — stats

**Files:** Extend `app/(app)/admin/page.tsx`.

- [ ] **Step 1:** Simple counts via admin client or SQL views: total users, level distribution, active users (entries in last 7 days). Render plain cards/table.
- [ ] **Step 2:** Commit.
```bash
git add -A && git commit -m "feat(admin): basic stats (users, level distribution, active)"
```

### Task 3.8: Exchange-rate cron

**Files:** Create `app/api/cron/rates/route.ts`, `lib/rates/provider.ts`, `vercel.json`.

- [ ] **Step 1:** **Verify Frankfurter** current free-tier (WebFetch `https://frankfurter.dev` / API host) before relying; note the working base URL.
- [ ] **Step 2:** `lib/rates/provider.ts`: `fetchRates(pivot, symbols): Promise<Record<string,number>>` hitting Frankfurter `latest?base=EUR&symbols=...`. Abstraction so provider is swappable.
- [ ] **Step 3:** `route.ts` (GET): check `Authorization: Bearer ${CRON_SECRET}` (or `?secret=`); load active currencies (admin client); fetch rates; upsert `exchange_rates` (admin client, bypass RLS); return JSON summary. On fetch failure: keep last cache, return 200 with `stale:true`.
- [ ] **Step 4:** `vercel.json` cron:
```json
{ "crons": [ { "path": "/api/cron/rates", "schedule": "0 1 * * *" } ] }
```
- [ ] **Step 5:** Manual verify: `curl` the route locally with the secret → `exchange_rates.fetched_at` updates.
- [ ] **Step 6:** Commit.
```bash
git add -A && git commit -m "feat: daily exchange-rate cron (Frankfurter) + provider abstraction"
```

### Task 3.9: README + deploy + polish

**Files:** Create `README.md`; review env + UI.

- [ ] **Step 1:** README: project overview, Supabase setup (apply `supabase/migrations/*` in order, or note they're already applied), env vars table, `npm run dev`, Vercel deploy steps (env + cron + `CRON_SECRET`), how leveling works (1-paragraph), non-goals.
- [ ] **Step 2:** Polish pass: empty states, loading skeletons, mobile spacing, "kurs per <tanggal>" label on dashboard, consistent CuanQuest theme. Game accents on level card/progress (tasteful).
- [ ] **Step 3:** Full verify: `npm run build` succeeds (no type errors); `npm test` green; click through all routes.
- [ ] **Step 4:** Commit.
```bash
git add -A && git commit -m "docs: README + deploy guide; UI polish pass"
```

> **CHECKPOINT — Fase 3 / Done.** Report build + test results; demo full flow.

---

## Self-Review (filled at write time)

- **Spec coverage:** product concept ✓ (level on total), tech stack ✓, leveling mechanic ✓ (1.6/2.x), data model ✓ (1.4), RLS ✓ (1.5), multi-currency ✓ (1.6/1.10/3.8), all 9 routes ✓ (1.12–1.13, 2.x, 3.x), quick-add UX ✓ (2.3), admin ✓ (3.5–3.7), security ✓ (1.5/1.3/2.1), build order ✓ (phases), seed ✓ (1.7), cron ✓ (3.8), README ✓ (3.9), non-goals respected (none built).
- **Placeholders:** none — DB/core code given verbatim; UI tasks specify components + behavior with key snippets.
- **Type consistency:** `createEntry` return shape consumed by 2.3; `levelForXp`/`progressToNext`/`crossConvert`/`formatMoney` signatures consistent across 1.9/1.10/2.5/3.3; `convert_amount`/`recompute_user_level` names consistent across 1.6/2.2.
- **Decisions honored:** (a) thresholds in user base, default IDR; (b) cross-currency transfer converts (fn_entries_apply); (c) category delete cascades (FK) + recompute, level holds.
