# Super Prompt — Wealth RPG Savings Tracker (MVP)

> Paste ini ke Claude Code. Ganti `[NAMA_APP]` dengan nama proyekmu. Ini scope MVP — fitur Phase 2 (crypto, edukasi, investasi) sengaja TIDAK termasuk.

---

Kamu adalah senior full-stack engineer. Bangun MVP siap-produksi dari sebuah web app personal finance ber-gamifikasi bernama **[NAMA_APP]**, di mana user naik level ala RPG dengan menumbuhkan total tabungan mereka. Ikuti spesifikasi ini secara persis. Tanyakan aku dulu sebelum membuat perubahan arsitektur besar. Tulis kode rapi, ber-tipe (TypeScript strict), dan beri komentar pada logika leveling.

## Konsep produk
**Tracker AKUMULASI TABUNGAN** yang dibingkai sebagai wealth RPG — BUKAN net-worth tracker dan BUKAN expense tracker. Aplikasi TIDAK mengurangi biaya hidup/pengeluaran dari level. Setiap user mulai dari 0, lalu mencatat uang yang mereka kumpulkan ke dalam **kategori (kantong) yang mereka namai sendiri** (mis. "Dana Darurat", "Pendapatan", "Liburan"). Level dihitung dari **TOTAL seluruh kantong digabung**, bukan per-kantong. Dukungan multi-mata uang adalah inti. Hook motivasinya: progres yang permanen dan hanya naik. **Ini bukan aplikasi nasihat keuangan/investasi.**

## Tech stack (pakai persis ini)
- Next.js 14 (App Router) + TypeScript (strict mode)
- Tailwind CSS + shadcn/ui
- Supabase (Postgres, Auth, Row Level Security)
- `@supabase/ssr` untuk auth & session
- Recharts untuk grafik
- Siap deploy ke Vercel

## MEKANIK INTI — Sistem leveling (paling penting, implementasi harus presisi)

Aturan emas: **level berbasis TOTAL semua kantong, terkunci di puncak tertinggi (tidak pernah turun). Semua user mulai dari 0.**

Definisi:
- `total` saat ini = `Σ konversi(category.current_balance, category.currency → base_currency)` untuk SEMUA kantong milik user.
- `peak_total` = nilai `total` tertinggi yang pernah dicapai (base currency). Mulai = 0.
- `current_xp` = `peak_total` (karena baseline semua user = 0).
- `current_level` = level tertinggi `L` di mana `levels.xp_required <= current_xp`.

Tiga jenis pencatatan (`entries`) dan efeknya:
- **`deposit` (setor / uang masuk dari luar):** `category.current_balance += amount` → `total` naik → bisa naik level.
- **`withdraw` (tarik / pakai / uang keluar):** `category.current_balance -= amount` → `total` turun → **level TIDAK turun** (terkunci di `peak_total`).
- **`transfer` (pindah antar-kantong):** `from.current_balance -= amount`, `to.current_balance += amount` → `total` TIDAK berubah (mencegah dobel hitung).

Recompute (jalankan via Postgres function/trigger setiap ada perubahan `entries` atau `categories`):
1. Hitung ulang `current_balance` kantong yang terdampak.
2. Hitung `total` (konversi semua kantong ke base currency).
3. Jika `total > peak_total` → `peak_total = total`.
4. `current_xp = peak_total`; `current_level = max level` dengan `xp_required <= current_xp`.
5. Jika level naik → catat `level_up_events` + kembalikan flag agar frontend memicu animasi perayaan.

Konsekuensi desain yang WAJIB benar:
- Semua user mulai di level 1 dengan total 0.
- XP monoton naik (terkunci di puncak) → menarik uang dari kantong TIDAK menurunkan level.
- Transfer antar-kantong netral terhadap level.
- Threshold antar level makin besar (lihat seed di bawah) dan **data-driven**: tersimpan di tabel `levels` yang bisa diedit admin tanpa deploy ulang. JANGAN hardcode angka level di kode.

> Opsi (default OFF): jika nanti ingin "semua benar-benar mulai dari nol" sehingga tabungan yang SUDAH ada tidak ikut menaikkan level, tambahkan `baseline` per user dan ganti `current_xp = peak_total - baseline`. Untuk MVP, `baseline = 0` (semua setoran dihitung).

## Data model (Postgres / Supabase)

```
profiles
  id                uuid  PK, FK -> auth.users.id
  base_currency     text  (mis. 'IDR') — untuk semua perhitungan level
  display_currency  text  — hanya untuk tampilan
  peak_total        numeric default 0
  current_xp        numeric default 0
  current_level     int     default 1
  is_admin          boolean default false
  created_at        timestamptz default now()

categories          -- "kantong" bernama bebas oleh user; ini penyimpan uang
  id              uuid PK
  user_id         uuid FK -> profiles.id
  name            text   (bebas, mis. 'Dana Darurat', 'Pendapatan', 'Liburan')
  icon            text NULL
  currency        text   — tiap kantong punya SATU mata uang
  current_balance numeric default 0  -- dijaga via trigger entries
  created_at      timestamptz default now()

entries             -- pencatatan masuk/keluar/pindah
  id              uuid PK
  user_id         uuid FK -> profiles.id
  category_id     uuid FK -> categories.id
  type            text  ('deposit' | 'withdraw' | 'transfer')
  amount          numeric  (mata uang kantongnya; selalu positif)
  to_category_id  uuid NULL  -- hanya untuk 'transfer'
  note            text NULL
  occurred_at     timestamptz
  created_at      timestamptz default now()

levels              -- GLOBAL config, dikelola admin, dibaca semua
  level        int  PK
  xp_required  numeric  -- kumulatif, dalam base currency
  title        text     -- flavor RPG, mis. 'Penabung'
  badge_icon   text NULL

currencies          -- GLOBAL, dikelola admin
  code      text PK  (mis. 'USD')
  name      text
  symbol    text
  is_active boolean default true

exchange_rates      -- cache kurs, di-refresh harian
  base_code  text
  quote_code text
  rate       numeric
  fetched_at timestamptz
  PRIMARY KEY (base_code, quote_code)

level_up_events     -- riwayat naik level untuk UI & analitik
  id        uuid PK
  user_id   uuid FK -> profiles.id
  new_level int
  created_at timestamptz default now()
```

Catatan: untuk MVP, satu kantong = satu mata uang. Jika user mau "Dana Darurat USD", buat kantong terpisah.

## Row Level Security (WAJIB, dari hari pertama)
Enable RLS di SEMUA tabel.
- `profiles`, `categories`, `entries`, `level_up_events`: user hanya bisa SELECT/INSERT/UPDATE/DELETE baris dengan `user_id = auth.uid()` (untuk `profiles`, `id = auth.uid()`).
- `levels`, `currencies`, `exchange_rates`: SELECT untuk semua user terautentikasi; INSERT/UPDATE/DELETE hanya jika `(SELECT is_admin FROM profiles WHERE id = auth.uid())` true.
- Tulis policy eksplisit per operasi. Sertakan migration SQL lengkap.

## Aturan multi-mata uang
- Simpan tiap entry & saldo kantong dalam **mata uang aslinya** — JANGAN pernah menimpa dengan hasil konversi.
- `total` & SEMUA perhitungan level pakai `base_currency` (konversi saldo tiap kantong ke base).
- `display_currency` hanya untuk menampilkan total ke user (konversi dari base saat render).
- Kurs: ambil harian dari API gratis (lihat catatan), simpan ke `exchange_rates`. Jika kurs tidak tersedia, fallback ke cache terakhir + tampilkan timestamp "kurs per ...".

## Halaman / route (MVP)
1. `/login`, `/signup` — Supabase Auth (email+password cukup).
2. `/onboarding` — pilih `base_currency`; (opsional) buat kantong pertama. TIDAK ada saldo awal yang dipaksa — mulai dari 0.
3. `/` (dashboard) — kartu level besar (nomor + title + badge), progress bar XP ke level berikutnya (tampilkan `current_xp` & sisa menuju `xp_required` level depan), **total tabungan** dalam `display_currency`, rincian saldo per kantong, entri terbaru.
4. `/add` — **quick-add pencatatan** (lihat UX di bawah).
5. `/categories` — kelola kantong (buat, rename, pilih mata uang, hapus).
6. `/history` — riwayat entri, filter per kantong/tipe.
7. `/insights` — grafik total tabungan dari waktu ke waktu + komposisi per kantong (Recharts). Ringan saja.
8. `/settings` — ubah `display_currency`, profil.
9. `/admin` — hanya untuk `is_admin` (lihat di bawah).

## Quick-add UX (kritikal — friksi input adalah pembunuh nomor satu)
Form `/add` harus bisa diselesaikan dalam < 5 detik:
- Toggle cepat tipe: **Setor / Tarik / Pindah** (default Setor).
- Field jumlah paling menonjol (number pad besar di mobile).
- Pilih kantong = chip/tombol cepat, bukan dropdown panjang. Ingat kantong terakhir dipakai. (Untuk Pindah: pilih kantong asal + tujuan.)
- `occurred_at` default = sekarang, bisa diubah.
- Setelah submit: animasi singkat, dan JIKA terjadi level up → layar perayaan (badge baru + title + threshold berikutnya).
- Optimistic UI; jangan blok user menunggu server.

## Admin (ringan, gated `is_admin`)
- **Konfigurasi level:** CRUD tabel `levels` (level, `xp_required`, title, badge). Inilah kenapa leveling data-driven — admin bisa rebalance tanpa deploy.
- **Mata uang:** kelola `currencies` (aktif/nonaktif), trigger refresh `exchange_rates` manual.
- **Statistik dasar:** jumlah user, distribusi level, user aktif. Angka sederhana saja untuk MVP.

## Persyaratan keamanan
- RLS aktif di semua tabel (di atas).
- `SUPABASE_SERVICE_ROLE_KEY` HANYA di server (route handler / edge function), JANGAN pernah ke client.
- Validasi semua input (zod) di server actions / route handlers (mis. `amount > 0`, tipe valid, `to_category_id` wajib & berbeda saat `transfer`).
- Jangan taruh data sensitif di URL/query string.
- Pakai `@supabase/ssr` dengan cookie-based session; lindungi route `/admin` di middleware + cek `is_admin` di server.

## Non-goals — JANGAN bangun ini (Phase 2+)
- Integrasi crypto / Web3 / baca wallet on-chain
- Modul edukasi / konten pelajaran
- Investasi/trading sungguhan atau robo-advisor (butuh izin OJK — di luar scope)
- Sinkronisasi rekening bank otomatis
- Fitur sosial / leaderboard / sharing
- Pelacakan pengeluaran/budgeting (aplikasi ini hanya akumulasi tabungan)

## Urutan build (deliverables)
1. Scaffold Next.js + Tailwind + shadcn/ui + koneksi Supabase. `.env.example`.
2. Migration SQL: semua tabel + RLS policies + trigger saldo kantong + Postgres function recompute leveling. Sertakan seed `levels` & `currencies`.
3. Auth (login/signup) + middleware proteksi route.
4. Onboarding (set base currency + buat kantong; mulai dari 0).
5. Quick-add (Setor/Tarik/Pindah) + trigger leveling + layar level up.
6. Dashboard (kartu level, progress XP, total tabungan, saldo per kantong, entri terbaru).
7. Categories management + History + Insights.
8. Settings (display currency, profil).
9. Admin (konfig level, mata uang, statistik).
10. README: cara setup Supabase, env vars, jalankan lokal, deploy ke Vercel.

## Catatan implementasi
- **API kurs:** pakai yang gratis tanpa API key seperti Frankfurter (`https://frankfurter.dev`). VERIFIKASI dulu syarat free-tier terkini sebelum bergantung penuh; sediakan layer abstraksi agar mudah diganti.
- **Refresh kurs:** pakai Vercel Cron (route `/api/cron/rates`, jadwal harian) ATAU Supabase Edge Function terjadwal. Upsert ke `exchange_rates`. Cache cukup 1x/hari.
- **Seed `levels` default** (asumsi base `IDR`, angka & title bebas di-tune admin; kurva makin berat tiap level):

| level | xp_required | title |
|------:|------------:|-------|
| 1 | 0 | Pemula |
| 2 | 1.000.000 | Penabung |
| 3 | 3.000.000 | Pengumpul |
| 4 | 7.000.000 | Pejuang Finansial |
| 5 | 15.000.000 | Ahli Cuan |
| 6 | 30.000.000 | Sultan Muda |
| 7 | 60.000.000 | Hartawan |
| 8 | 120.000.000 | Konglomerat |
| 9 | 250.000.000 | Taipan |
| 10 | 500.000.000 | Legenda |

- **UI/UX:** modern, bersih, mobile-first. Komponen via shadcn/ui. Sentuhan "game" pada kartu level & progress bar (tetap profesional, bukan norak).
- Tulis kode agar `base_currency` & seri kurs mudah diperluas saat Phase 2 (crypto/aset) masuk.

Mulai dari langkah 1, tunjukkan rencana struktur folder, lalu lanjut bertahap.
