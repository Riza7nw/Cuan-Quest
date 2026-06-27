"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { onboardingSchema, settingsSchema } from "@/lib/validation/profile";

export type OnboardingState = { error?: string };

export async function completeOnboarding(
  _prev: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  const parsed = onboardingSchema.safeParse({
    base_currency: formData.get("base_currency"),
    first_pocket_name: (formData.get("first_pocket_name") as string) || undefined,
  });
  if (!parsed.success) return { error: "Input tidak valid." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { base_currency, first_pocket_name } = parsed.data;

  const { data: cur } = await supabase
    .from("currencies")
    .select("code")
    .eq("code", base_currency)
    .eq("is_active", true)
    .maybeSingle();
  if (!cur) return { error: "Mata uang tidak didukung." };

  // Idempotent: once the user has pockets, onboarding is a no-op (no duplicate
  // first pocket, no base-currency churn after the account is funded).
  const { count } = await supabase
    .from("categories")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  if ((count ?? 0) === 0) {
    const { error } = await supabase
      .from("profiles")
      .update({ base_currency, display_currency: base_currency })
      .eq("id", user.id);
    if (error) return { error: error.message };

    if (first_pocket_name) {
      const { error: catError } = await supabase
        .from("categories")
        .insert({ user_id: user.id, name: first_pocket_name, currency: base_currency });
      if (catError) return { error: catError.message };
    }
  }

  redirect("/");
}

export type SettingsState = { error?: string; ok?: boolean };

export async function updateDisplayCurrency(input: {
  display_currency: string;
}): Promise<SettingsState> {
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return { error: "Input tidak valid." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesi habis." };

  const { data: cur } = await supabase
    .from("currencies")
    .select("code")
    .eq("code", parsed.data.display_currency)
    .eq("is_active", true)
    .maybeSingle();
  if (!cur) return { error: "Mata uang tidak didukung." };

  const { error } = await supabase
    .from("profiles")
    .update({ display_currency: parsed.data.display_currency })
    .eq("id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/");
  revalidatePath("/settings");
  revalidatePath("/insights");
  return { ok: true };
}
