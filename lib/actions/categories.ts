"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  categoryCreateSchema,
  categoryUpdateSchema,
} from "@/lib/validation/categories";

export type ActionResult = { ok: true } | { ok: false; error: string };

async function ctx() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function createCategory(input: {
  name: string;
  currency: string;
  icon?: string | null;
  target_amount?: number | null;
}): Promise<ActionResult> {
  const parsed = categoryCreateSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Input tidak valid." };

  const { supabase, user } = await ctx();
  if (!user) return { ok: false, error: "Sesi habis." };

  const { data: cur } = await supabase
    .from("currencies")
    .select("code")
    .eq("code", parsed.data.currency)
    .eq("is_active", true)
    .maybeSingle();
  if (!cur) return { ok: false, error: "Mata uang tidak didukung." };

  const { error } = await supabase.from("categories").insert({
    user_id: user.id,
    name: parsed.data.name,
    currency: parsed.data.currency,
    icon: parsed.data.icon ?? null,
    target_amount: parsed.data.target_amount ?? null,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/categories");
  revalidatePath("/");
  revalidatePath("/add");
  return { ok: true };
}

export async function renameCategory(input: {
  id: string;
  name: string;
  icon?: string | null;
  target_amount?: number | null;
}): Promise<ActionResult> {
  const parsed = categoryUpdateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Input tidak valid." };

  const { supabase, user } = await ctx();
  if (!user) return { ok: false, error: "Sesi habis." };

  const { error } = await supabase
    .from("categories")
    .update({
      name: parsed.data.name,
      icon: parsed.data.icon ?? null,
      target_amount: parsed.data.target_amount ?? null,
    })
    .eq("id", parsed.data.id)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/categories");
  revalidatePath("/");
  return { ok: true };
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  const { supabase, user } = await ctx();
  if (!user) return { ok: false, error: "Sesi habis." };

  // Cascades the pocket's entries (FK) and recomputes the level (trigger);
  // the level stays put because peak_total never decreases.
  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/categories");
  revalidatePath("/");
  revalidatePath("/add");
  return { ok: true };
}
