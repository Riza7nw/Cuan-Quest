"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { refreshExchangeRates } from "@/lib/rates/provider";
import { levelSchema } from "@/lib/validation/admin";

export type AdminResult = { ok: true } | { ok: false; error: string };

// Resolve the caller and confirm admin. RLS (is_admin()) already blocks every
// write below, but this surfaces a clean message instead of a raw policy error.
async function adminCtx() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesi habis." as const };
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!profile?.is_admin) return { error: "Akses ditolak." as const };
  return { supabase, error: undefined as undefined };
}

export async function upsertLevel(input: unknown): Promise<AdminResult> {
  const parsed = levelSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Input tidak valid." };

  const { level, xp_required: xp } = parsed.data;

  // The threshold feeds the leveling engine directly, so reject anything that
  // would corrupt the ladder. z.coerce.number turns "" into 0, so an empty XP
  // field must not silently pass for a higher tier.
  if (!Number.isFinite(xp)) return { ok: false, error: "XP harus berupa angka." };
  // Level 1 is the floor everyone starts at (the engine coalesces to it).
  if (level === 1 && xp !== 0)
    return { ok: false, error: "Level 1 harus memiliki XP 0." };
  if (level > 1 && xp <= 0)
    return { ok: false, error: "XP harus lebih besar dari 0." };

  const { supabase, error: ctxError } = await adminCtx();
  if (ctxError) return { ok: false, error: ctxError };

  // Enforce strict monotonicity: a higher level must require strictly more XP.
  // Without this, max(level where xp_required <= peak) could place users on the
  // wrong tier (or a 0-threshold high level would vault everyone to it).
  const { data: others } = await supabase
    .from("levels")
    .select("level,xp_required")
    .neq("level", level);
  for (const o of others ?? []) {
    const ov = Number(o.xp_required);
    if (o.level < level && ov >= xp)
      return {
        ok: false,
        error: `XP harus lebih besar dari level ${o.level} (${ov.toLocaleString("id-ID")}).`,
      };
    if (o.level > level && ov <= xp)
      return {
        ok: false,
        error: `XP harus lebih kecil dari level ${o.level} (${ov.toLocaleString("id-ID")}).`,
      };
  }

  const { error } = await supabase.from("levels").upsert(
    {
      level,
      xp_required: xp,
      title: parsed.data.title,
      badge_icon: parsed.data.badge_icon ?? null,
    },
    { onConflict: "level" }
  );
  if (error) return { ok: false, error: error.message };

  // The DB trigger (0009) recomputes every user's level on this write.
  revalidatePath("/admin/levels");
  revalidatePath("/"); // level titles/badges surface on the dashboard
  return { ok: true };
}

export async function deleteLevel(level: number): Promise<AdminResult> {
  if (level === 1) return { ok: false, error: "Level 1 tidak dapat dihapus." };

  const { supabase, error: ctxError } = await adminCtx();
  if (ctxError) return { ok: false, error: ctxError };

  const { error } = await supabase.from("levels").delete().eq("level", level);
  if (error) return { ok: false, error: error.message };

  // The DB trigger (0009) recomputes every user against the reshaped ladder, so
  // anyone sitting on the deleted tier moves to the nearest remaining one.

  revalidatePath("/admin/levels");
  revalidatePath("/");
  return { ok: true };
}

export async function setCurrencyActive(
  code: string,
  active: boolean
): Promise<AdminResult> {
  const { supabase, error: ctxError } = await adminCtx();
  if (ctxError) return { ok: false, error: ctxError };

  const { error } = await supabase
    .from("currencies")
    .update({ is_active: active })
    .eq("code", code);
  if (error) return { ok: false, error: error.message };

  // Pickers (onboarding/settings/new pocket) only list active currencies.
  revalidatePath("/admin/currencies");
  revalidatePath("/settings");
  revalidatePath("/onboarding");
  revalidatePath("/categories");
  return { ok: true };
}

export type RefreshResult =
  | { ok: true; updated: number; date: string }
  | { ok: false; error: string };

// Manual rate refresh from the admin UI. Same path as the daily cron, but run
// through the admin's session client (the rates_write policy permits it), so it
// needs no service-role key.
export async function refreshRatesNow(): Promise<RefreshResult> {
  const { supabase, error: ctxError } = await adminCtx();
  if (ctxError) return { ok: false, error: ctxError };

  try {
    const { updated, date } = await refreshExchangeRates(supabase);
    revalidatePath("/admin/currencies");
    revalidatePath("/");
    revalidatePath("/insights");
    return { ok: true, updated, date };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Gagal memuat kurs.",
    };
  }
}
