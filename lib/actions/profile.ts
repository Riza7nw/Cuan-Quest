"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { onboardingSchema } from "@/lib/validation/profile";

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

  // Base currency drives all level math; display defaults to the same.
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

  redirect("/");
}
