import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { QuickAddForm } from "@/components/quick-add-form";

export default async function AddPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: pockets } = await supabase
    .from("categories")
    .select("id,name,currency,icon")
    .eq("user_id", user.id)
    .order("created_at");

  if (!pockets || pockets.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        Belum ada kantong.{" "}
        <Link href="/categories" className="font-medium underline underline-offset-4">
          Buat kantong dulu
        </Link>{" "}
        untuk mencatat tabungan.
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">Catat</h1>
      <QuickAddForm pockets={pockets} />
    </div>
  );
}
