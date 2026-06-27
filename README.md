# CuanQuest

Gamified **savings** tracker. You create named "pockets" (kantong), record
deposits/withdrawals/transfers, and **level up** as your *total* savings grow.

It is an **accumulation** game, not a net-worth or expense tracker:

- **XP = the all-time peak of your total savings** (converted to your base
  currency). It is *monotonic* — withdrawing money lowers your current total but
  **never lowers your level**. The peak only ever rises.
- **Level** = the highest level whose `xp_required` is `≤` your XP. Everyone
  starts at level 1 with 0 XP.
- Thresholds and titles live in the `levels` table and are **fully data-driven**
  (editable in the admin UI) — never hardcoded in app logic.

### Entry types

| Type | Effect on a pocket | Effect on level |
| --- | --- | --- |
| **Deposit** (Setor) | `+amount` | can raise it |
| **Withdraw** (Tarik) | `−amount` | holds (peak unchanged) |
| **Transfer** (Pindah) | `−amount` from source, converted `+` to target | neutral |

### Multi-currency

Each pocket has its own currency. Two currency roles per user:

- **base_currency** — set at onboarding; the currency the **level math** runs in.
- **display_currency** — UI-only; what totals are *shown* in. Changing it never
  touches your level.

Cross-currency math uses **EUR as the pivot** (matching the Frankfurter / ECB
rate feed). Rates refresh daily via cron and can be forced from the admin UI.

---

## Tech stack

- **Next.js 16** (App Router, Turbopack) — note: middleware is now `proxy.ts`.
- **React 19**, **TypeScript** (strict), **Tailwind v4**, **shadcn/ui on Base UI**.
- **Supabase** — Postgres, Auth, Row Level Security, `@supabase/ssr`.
- **Recharts** for insights. **Vitest** for the pure leveling/currency logic.
- The leveling engine lives in **Postgres triggers** (`supabase/migrations/`), so
  balances and levels are correct no matter how rows are written.

---

## Local setup

### 1. Install

```bash
npm install
```

### 2. Environment

Copy `.env.example` to `.env.local` and fill it in (values from your Supabase
project → **Settings → API**):

```bash
cp .env.example .env.local
```

| Variable | Where it's used | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | client + server | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client + server | Publishable / anon key (RLS applies) |
| `SUPABASE_SERVICE_ROLE_KEY` | **server only** (cron) | Bypasses RLS — never expose to the browser |
| `CRON_SECRET` | `/api/cron/rates` | Any long random string; Vercel Cron sends it as a Bearer token |

### 3. Database

Apply the migrations in `supabase/migrations/` **in order** (`0001` → `0008`).
They create the schema, RLS policies, the leveling engine (functions + triggers),
seed data (levels, currencies, an initial rate snapshot), security hardening, and
the `admin_stats()` function.

- **Supabase CLI:** `supabase db push` (or `supabase migration up`).
- **Dashboard:** paste each file into the SQL editor in order.

RLS is enabled on every table from `0002` onward — the app never runs without it.

### 4. Run

```bash
npm run dev
```

Open <http://localhost:3000>. Sign up, complete onboarding (pick a base currency
and your first pocket), and start adding entries.

> If email confirmation is on in your Supabase project, either confirm the link
> or disable **Auth → Email → Confirm email** for quick local testing.

### Scripts

```bash
npm run dev        # dev server
npm run build      # production build (also type-checks every route)
npm run typecheck  # tsc --noEmit
npm test           # vitest (leveling, currency, insights)
```

---

## Becoming an admin

`is_admin` is protected — a guard trigger blocks users from promoting
themselves. Flip it from a trusted context (SQL editor / service role):

```sql
update profiles set is_admin = true
where id = (select id from auth.users where email = 'you@example.com');
```

Admins get an **Admin** menu entry with:

- **Statistik** — user / pocket / entry counts and the level distribution
  (served by the `admin_stats()` SECURITY DEFINER function, gated by `is_admin()`
  — no service-role key needed).
- **Level** — full CRUD on the `levels` table (the leveling thresholds).
- **Mata uang** — toggle currencies active/inactive and **force a rate refresh**.

---

## Exchange-rate cron

`vercel.json` schedules `GET /api/cron/rates` daily (`0 6 * * *`). On Vercel,
set `CRON_SECRET` in the project env — Vercel Cron automatically sends it as
`Authorization: Bearer <CRON_SECRET>`, which the route verifies before using the
service-role client to upsert a fresh EUR-based snapshot from Frankfurter. The
admin "Perbarui sekarang" button runs the same refresh through the admin's
session (no service-role key involved).

Trigger it manually:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://YOUR-APP.vercel.app/api/cron/rates
```

---

## Deploy on Vercel

1. Import the repo into Vercel.
2. Add all four env vars (above) for Production.
3. Deploy. The `crons` entry in `vercel.json` registers automatically.

The leveling logic is in the database, so the same Supabase project backs every
environment — point each Vercel env at the right project URL/keys.
