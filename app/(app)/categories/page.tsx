import { createClient, getUser } from "@/lib/supabase/server";
import { CategoryManager } from "@/components/category-manager";

export default async function CategoriesPage() {
  const user = await getUser();
  if (!user) return null;

  const supabase = await createClient();

  const [categoriesRes, currenciesRes] = await Promise.all([
    supabase
      .from("categories")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at"),
    supabase
      .from("currencies")
      .select("code,name")
      .eq("is_active", true)
      .order("code"),
  ]);

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">Kantong</h1>
      <CategoryManager
        categories={categoriesRes.data ?? []}
        currencies={currenciesRes.data ?? []}
      />
    </div>
  );
}
