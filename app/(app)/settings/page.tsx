import { createClient, getUser } from "@/lib/supabase/server";
import { SettingsForm } from "@/components/settings-form";

export default async function SettingsPage() {
  const user = await getUser();
  if (!user) return null;

  const supabase = await createClient();

  const [profileRes, currenciesRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("base_currency,display_currency")
      .eq("id", user.id)
      .single(),
    supabase
      .from("currencies")
      .select("code,name")
      .eq("is_active", true)
      .order("code"),
  ]);

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">Setelan</h1>
      <SettingsForm
        baseCurrency={profileRes.data?.base_currency ?? "IDR"}
        displayCurrency={profileRes.data?.display_currency ?? "IDR"}
        currencies={currenciesRes.data ?? []}
      />
    </div>
  );
}
