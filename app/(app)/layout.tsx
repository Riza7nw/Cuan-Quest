import { redirect } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import { AppNav } from "@/components/app-nav";
import { BottomNav } from "@/components/bottom-nav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  return (
    <div className="flex min-h-screen flex-col">
      <AppNav isAdmin={!!profile?.is_admin} />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 pb-28">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
