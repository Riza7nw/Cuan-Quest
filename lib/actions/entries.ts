"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  entrySchema,
  entryUpdateSchema,
  type EntryInput,
  type EntryUpdateInput,
} from "@/lib/validation/entries";

export type CreateEntryResult =
  | {
      ok: true;
      leveledUp: boolean;
      newLevel: number;
      newTitle: string | null;
      newRecord: boolean;
    }
  | { ok: false; error: string };

// Records an entry. The DB triggers maintain pocket balances and recompute the
// level synchronously, so we read the level before/after to detect a level-up.
export async function createEntry(
  input: EntryInput
): Promise<CreateEntryResult> {
  const parsed = entrySchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Input tidak valid.",
    };
  }
  const data = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sesi habis. Masuk lagi ya." };

  const { data: before } = await supabase
    .from("profiles")
    .select("current_level,current_xp")
    .eq("id", user.id)
    .single();
  const beforeLevel = before?.current_level ?? 1;
  const beforeXp = Number(before?.current_xp ?? 0);

  // RLS scopes the insert to this user; ownership of category/to_category is
  // enforced by the entries_insert policy. The trigger does the rest.
  const { error: insertError } = await supabase.from("entries").insert({
    user_id: user.id,
    type: data.type,
    category_id: data.category_id,
    amount: data.amount,
    to_category_id:
      data.type === "transfer" ? data.to_category_id ?? null : null,
    note: data.note ?? null,
    occurred_at: data.occurred_at ? data.occurred_at.toISOString() : undefined,
  });
  if (insertError) return { ok: false, error: insertError.message };

  const { data: after } = await supabase
    .from("profiles")
    .select("current_level,current_xp")
    .eq("id", user.id)
    .single();
  const afterLevel = after?.current_level ?? beforeLevel;
  const afterXp = Number(after?.current_xp ?? beforeXp);
  const leveledUp = afterLevel > beforeLevel;
  // peak_total (== current_xp) only rises; a strict increase means this entry
  // set a new all-time high.
  const newRecord = afterXp > beforeXp;

  let newTitle: string | null = null;
  if (leveledUp) {
    const { data: lvl } = await supabase
      .from("levels")
      .select("title")
      .eq("level", afterLevel)
      .single();
    newTitle = lvl?.title ?? null;
  }

  revalidatePath("/");
  revalidatePath("/history");
  revalidatePath("/insights"); // charts read the entries table
  revalidatePath("/categories"); // pocket balances change

  return { ok: true, leveledUp, newLevel: afterLevel, newTitle, newRecord };
}

export type EntryMutateResult = { ok: true } | { ok: false; error: string };

function revalidateEntryViews() {
  revalidatePath("/");
  revalidatePath("/history");
  revalidatePath("/insights");
  revalidatePath("/categories");
}

// Map raw Postgres errors from the edit/delete RPCs to friendly Indonesian.
function friendlyEntryError(msg: string): string {
  if (msg.includes("categories_balance_nonneg"))
    return "Tidak bisa — saldo kantong jadi minus (dana sudah dipakai).";
  if (msg.includes("Saldo kantong tidak cukup")) return "Saldo kantong tidak cukup.";
  if (msg.includes("Entri tidak ditemukan")) return "Entri tidak ditemukan.";
  return msg;
}

// Delete an entry and reverse its balance effect (peak/level never decrease, so
// deleting a deposit can't cost you a level you truly earned). See migration 0012.
export async function deleteEntry(id: string): Promise<EntryMutateResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_entry", { p_entry: id });
  if (error) return { ok: false, error: friendlyEntryError(error.message) };
  revalidateEntryViews();
  return { ok: true };
}

// Edit an entry. amount applies to deposit/withdraw; the RPC ignores it for
// transfers (note/date only) to avoid cross-rate drift.
export async function updateEntry(
  input: EntryUpdateInput
): Promise<EntryMutateResult> {
  const parsed = entryUpdateSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Input tidak valid.",
    };

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_entry", {
    p_entry: parsed.data.id,
    p_amount: parsed.data.amount ?? undefined,
    p_note: parsed.data.note ?? undefined,
    p_occurred_at: parsed.data.occurred_at
      ? parsed.data.occurred_at.toISOString()
      : undefined,
  });
  if (error) return { ok: false, error: friendlyEntryError(error.message) };
  revalidateEntryViews();
  return { ok: true };
}
