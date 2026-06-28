"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { entrySchema, type EntryInput } from "@/lib/validation/entries";

export type CreateEntryResult =
  | { ok: true; leveledUp: boolean; newLevel: number; newTitle: string | null }
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
    .select("current_level")
    .eq("id", user.id)
    .single();
  const beforeLevel = before?.current_level ?? 1;

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
    .select("current_level")
    .eq("id", user.id)
    .single();
  const afterLevel = after?.current_level ?? beforeLevel;
  const leveledUp = afterLevel > beforeLevel;

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

  return { ok: true, leveledUp, newLevel: afterLevel, newTitle };
}
