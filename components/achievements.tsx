import { formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import type { Level } from "@/lib/types";

type Event = { new_level: number; created_at: string };

// "Trophy shelf" — surfaces the level_up_events the engine already records but
// that previously had no UI. A permanent record that the climb is banked forever.
export function Achievements({
  events,
  levels,
}: {
  events: Event[];
  levels: Level[];
}) {
  const byLevel = new Map(levels.map((l) => [l.level, l]));

  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold">Pencapaian</h3>
      {events.length === 0 ? (
        <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          Belum ada piala. Naik ke Level 2 untuk pencapaian pertamamu! 🏆
        </p>
      ) : (
        <ul className="divide-y rounded-xl border">
          {events.map((e) => {
            const lvl = byLevel.get(e.new_level);
            return (
              <li
                key={`${e.new_level}-${e.created_at}`}
                className="flex items-center gap-3 px-4 py-3 text-sm"
              >
                <span className="text-xl" aria-hidden="true">
                  {lvl?.badge_icon ?? "🏆"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    Level {e.new_level}
                    {lvl?.title ? ` · ${lvl.title}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(e.created_at), {
                      addSuffix: true,
                      locale: idLocale,
                    })}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
