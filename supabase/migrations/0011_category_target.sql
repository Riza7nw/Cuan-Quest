-- Optional per-pocket savings target (e.g. "Liburan: 15,000,000 IDR"). Purely a
-- display-layer goal: progress = current_balance / target_amount in the pocket's
-- own currency. It deliberately does NOT feed peak_total / XP / level (those run
-- on the total of all pockets in base currency) — a goal is a sub-quest, not a
-- second level system. Nullable; fn_guard_category only freezes current_balance,
-- so target_amount stays user-editable under the existing owner-scoped RLS.
alter table categories
  add column if not exists target_amount numeric
  check (target_amount is null or target_amount > 0);
