import { createClient } from "@/lib/supabase/server";
import { OnboardingForm } from "@/components/onboarding-form";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data: currencies } = await supabase
    .from("currencies")
    .select("code,name,symbol")
    .eq("is_active", true)
    .order("code");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-4">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">CuanQuest</h1>
        <p className="text-sm text-muted-foreground">Satu langkah lagi…</p>
      </div>
      <OnboardingForm currencies={currencies ?? []} />
    </main>
  );
}
