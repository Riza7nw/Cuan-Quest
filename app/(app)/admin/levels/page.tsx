import { createClient } from "@/lib/supabase/server";
import { LevelEditor } from "@/components/admin/level-editor";

export default async function AdminLevelsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("levels")
    .select("level,xp_required,title,badge_icon")
    .order("level");

  return <LevelEditor levels={data ?? []} />;
}
