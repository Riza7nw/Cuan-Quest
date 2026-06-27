import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

// Server-side admin gate. The (app) layout already requires a session; here we
// re-check is_admin straight from the DB (never trust a client claim) and bounce
// non-admins back to the dashboard. RLS is the real enforcement; this is UX.
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!profile?.is_admin) redirect("/");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Admin</h1>
        <nav className="mt-2 flex gap-1 text-sm">
          {[
            { href: "/admin", label: "Statistik" },
            { href: "/admin/levels", label: "Level" },
            { href: "/admin/currencies", label: "Mata uang" },
          ].map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className="rounded-lg px-3 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {t.label}
            </Link>
          ))}
        </nav>
      </div>
      {children}
    </div>
  );
}
