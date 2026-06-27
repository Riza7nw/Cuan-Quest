# CuanQuest — Design Doc (MVP)

> Wealth RPG Savings Tracker. Sumber kebenaran produk: `super-prompt-wealth-rpg-mvp.md`.
> Dokumen ini menambahkan keputusan arsitektur + 3 keputusan yang dikonfirmasi user.
> Tanggal: 2026-06-27 · Status: **Disetujui (gas)**

## 1. Ringkasan

Web app personal finance ber-gamifikasi. User mencatat **akumulasi tabungan** ke dalam
"kantong" (categories) bernama bebas; **level RPG dihitung dari TOTAL semua kantong**
(dikonversi ke base currency), terkunci di puncak tertinggi (**tidak pernah turun**).
Bukan net-worth, bukan expense tracker, bukan aplikasi nasihat investasi.

- **Nama app:** CuanQuest
- **Supabase:** project "Riza7nw's Project" (`zlqsjumjzgbuoaehomtb`, region ap-southeast-2,
  Postgres 17). Skema di-apply via Supabase MCP **dan** disimpan sebagai file SQL di repo.
- **Cek-in:** per fase besar (3 fase, lihat §11).

## 2. Tech stack (fixed)

Next.js 14 (App Router) + TypeScript strict · Tailwind + shadcn/ui · Supabase (Postgres,
Auth, RLS) · `@supabase/ssr` · Recharts · deploy-ready ke Vercel.

## 3. Keputusan arsitektur inti — DB-authoritative (Pendekatan A)

Semua perhitungan uang + leveling + konversi hidup di **Postgres** (trigger + function).
Server Action hanya **validasi (zod) + orkestrasi**. Service-role key **hanya** di route
cron kurs; tak pernah ke client.

**Alur tulis (write):**
```
Client → Server Action
  → zod validate (amount>0, tipe valid, transfer butuh to_category_id ≠ category_id)
  → insert/update entry via Supabase server client (sesi user, RLS aktif)
  → trigger DB: recompute saldo kantong → recompute total → update peak/xp/level
                → jika naik: insert level_up_events
  → Server Action baca-ulang profile; bandingkan level lama vs baru
  → return { balances, level, title, leveledUp } untuk animasi
```
**Alur baca (read):** Server Components ambil profile/categories/entries via sesi user
(RLS). Konversi ke `display_currency` dilakukan di app saat render.

Kenapa A: invariant "peak tak pernah turun" dipaksa di DB; tidak bisa dicurangi walau
seseorang hit DB langsung dengan token miliknya; sesuai spec ("trigger setiap ada
perubahan entries atau categories"). Logika leveling diberi komentar (syarat spec).

## 4. Keputusan yang dikonfirmasi user

**(a) Threshold level lintas mata uang.** `levels` global; seed di-tune untuk IDR.
Threshold berlaku sebagai angka **dalam base_currency tiap user**; onboarding **default
ke IDR**. Konsekuensi (diterima utk MVP): base non-IDR membuat threshold tak adil.
Phase 2 bisa menormalkan. **JANGAN hardcode** angka level — semua dari tabel `levels`.

**(b) Transfer lintas mata uang = konversi otomatis.** Source berkurang `amount` (mata
uang source); destination bertambah `convert_amount(amount, source.currency,
dest.currency)`. Total base tetap (selisih hanya pembulatan). Trigger yang menghitung sisi
tujuan, jadi `entries.amount` cukup satu kolom (mata uang source).

**(c) Hapus kantong = delete + cascade.** Hapus kantong menghapus entry-nya (cascade) +
total dihitung ulang; **level tetap** (tidak turun). UI wajib konfirmasi + peringatan.
Ganti mata uang kantong hanya boleh saat saldo 0 & tanpa entry; rename selalu boleh.

## 5. Data model

Sesuai skema di super-prompt (`profiles`, `categories`, `entries`, `levels`,
`currencies`, `exchange_rates`, `level_up_events`). Klarifikasi/penambahan:

- `profiles`: dibuat otomatis via trigger `on auth.users insert`. `display_currency`
  default = `base_currency` (di-set saat onboarding). `peak_total/current_xp` default 0,
  `current_level` default 1.
- `categories`: `currency` immutable bila `current_balance ≠ 0` atau punya entry.
  `current_balance` dijaga trigger. `entries(category_id)` ON DELETE CASCADE.
- `entries`: `amount` selalu > 0, dalam mata uang `category_id`. `to_category_id` hanya
  utk `transfer` (wajib, ≠ `category_id`). Cross-currency: sisi tujuan dihitung trigger.
- `exchange_rates`: simpan baris **pivot→quote** (pivot = `EUR`, default Frankfurter).
  PK `(base_code, quote_code)`. `convert_amount` pakai cross-rate.
- Index: `entries(user_id, occurred_at desc)`, `entries(category_id)`,
  `categories(user_id)`, `level_up_events(user_id, created_at desc)`.

## 6. Mekanik leveling (presisi)

Definisi (semua di base_currency):
- `total = Σ convert_amount(category.current_balance, category.currency, base_currency)`
  untuk SEMUA kantong user.
- `peak_total` = nilai `total` tertinggi yang pernah dicapai (mulai 0).
- `current_xp = peak_total` (baseline 0; semua setoran dihitung).
- `current_level` = level tertinggi `L` dengan `levels.xp_required ≤ current_xp`.

Efek tiap tipe entry pada `category.current_balance`:
- `deposit`: `category += amount` → total naik → bisa naik level.
- `withdraw`: `category -= amount` → total turun → **level TIDAK turun** (kunci di peak).
- `transfer`: `source -= amount`, `dest += convert_amount(amount, source.cur, dest.cur)`
  → total base ~tetap → netral terhadap level.

Recompute (trigger pada perubahan `entries` & `categories`):
1. Hitung ulang `current_balance` kantong terdampak.
2. Hitung `total` (konversi semua kantong ke base).
3. Jika `total > peak_total` → `peak_total = total`.
4. `current_xp = peak_total`; `current_level = max level (xp_required ≤ current_xp)`.
5. Jika level naik → insert `level_up_events` (riwayat + memicu animasi via flag action).

Konversi: `convert_amount(amount, from, to)` = `amount` bila `from=to`; selainnya
`amount * get_rate(to) / get_rate(from)`, dengan `get_rate(code)=1` bila `code=pivot`,
selainnya `rate` dari `exchange_rates(base=pivot, quote=code)`. Seed snapshot kurs awal
saat migration agar function tak pernah null; cron me-refresh harian.

## 7. Multi-currency & kurs

- Saldo & entry disimpan di **mata uang asli**, tak pernah ditimpa hasil konversi.
- `display_currency` hanya untuk tampilan (konversi base→display saat render).
- Kurs: `GET /api/cron/rates` (Vercel Cron harian, header `CRON_SECRET`) → fetch
  Frankfurter (`https://api.frankfurter.dev`/`frankfurter.app`) untuk pivot→active
  currencies → upsert `exchange_rates`. Layer abstraksi `lib/rates/` agar provider mudah
  diganti. **Verifikasi free-tier Frankfurter dulu** sebelum bergantung penuh. Gagal →
  fallback cache + label "kurs per <tanggal>".

## 8. RLS (aktif di SEMUA tabel, sejak hari 1)

- `profiles`: baris `id = auth.uid()`. `categories/entries/level_up_events`: baris
  `user_id = auth.uid()`. Policy eksplisit per operasi (SELECT/INSERT/UPDATE/DELETE).
- `levels/currencies/exchange_rates`: SELECT semua user terautentikasi; tulis hanya bila
  `(select is_admin from profiles where id = auth.uid())`.
- `exchange_rates` tulis oleh cron via service-role (bypass RLS, server-only).

## 9. Routes

`/login`, `/signup`, `/onboarding`, `/` (dashboard), `/add`, `/categories`, `/history`,
`/insights`, `/settings`, `/admin` (+ `/admin/levels`, `/admin/currencies`).
`/admin` dijaga middleware + cek `is_admin` di server.

Quick-add UX (`/add`): selesai < 5 detik — toggle Setor/Tarik/Pindah (default Setor),
field jumlah dominan (number pad mobile), pilih kantong via chip (ingat terakhir dipakai),
`occurred_at` default sekarang, optimistic UI, layar perayaan saat level up.

## 10. Security

RLS (atas) · `SUPABASE_SERVICE_ROLE_KEY` server-only · validasi zod di semua server
action/route · tidak ada data sensitif di URL · `@supabase/ssr` cookie session ·
proteksi `/admin` di middleware + server.

## 11. Fase build (3 cek-in)

- **Fase 1 — Fondasi:** scaffold (Next+Tailwind+shadcn) + wiring Supabase + `.env.example`
  + SEMUA migration (tabel, RLS, trigger, function leveling, seed levels+currencies+kurs)
  di-apply via MCP + auth (login/signup) + middleware + onboarding.
- **Fase 2 — Core loop:** quick-add (Setor/Tarik/Pindah) + trigger leveling end-to-end +
  level-up screen + dashboard (level card, XP progress, total, saldo/kantong, entri).
- **Fase 3 — Sisanya:** categories, history, insights (Recharts), settings, admin
  (CRUD levels, currencies, statistik), cron kurs, README, polish UI.

## 12. Testing

- **TDD** untuk logika murni: leveling (xp→level), cross-rate currency, skema zod (Vitest).
- DB function/trigger: skenario SQL (setor/tarik/pindah → assert total, peak, level,
  level_up_events).
- **Verification-based** untuk UI/integrasi (jalankan app, cek alur kritikal).

## 13. Non-goals (Phase 2+)

Crypto/Web3 · modul edukasi · investasi/trading/robo-advisor · sinkron bank otomatis ·
sosial/leaderboard/sharing · expense/budgeting. **JANGAN dibangun.**

## 14. Env vars

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (publishable),
`SUPABASE_SERVICE_ROLE_KEY` (server-only), `CRON_SECRET`. URL + publishable key diambil
via MCP; service-role key disediakan user dari dashboard Supabase.
