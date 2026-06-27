import type { Level } from "@/lib/types";

// Accepts any object carrying the level/xp/title fields (e.g. rows from the
// data-driven `levels` table). Level numbers may be non-consecutive.
type LevelLike = Pick<Level, "level" | "xp_required" | "title"> & Partial<Level>;

// Highest level whose xp_required <= xp. Thresholds come from the DB, never
// hardcoded. This mirrors the SQL recompute (max level with xp_required <= xp).
export function levelForXp(xp: number, levels: LevelLike[]): number {
  const sorted = [...levels].sort((a, b) => a.xp_required - b.xp_required);
  let result = sorted[0]?.level ?? 1;
  for (const l of sorted) {
    if (xp >= l.xp_required) result = l.level;
  }
  return result;
}

// Progress from the current level toward the next one, for the XP bar.
export function progressToNext(xp: number, levels: LevelLike[]) {
  const sorted = [...levels].sort((a, b) => a.xp_required - b.xp_required);
  const curLevel = levelForXp(xp, sorted);
  const curIdx = sorted.findIndex((l) => l.level === curLevel);
  const current = curIdx >= 0 ? sorted[curIdx] : null;
  const next = curIdx >= 0 && curIdx + 1 < sorted.length ? sorted[curIdx + 1] : null;

  if (!next) {
    // At (or beyond) the top level — bar is full.
    return { current, next: null as LevelLike | null, pct: 100, remaining: 0 };
  }

  const base = current?.xp_required ?? 0;
  const span = next.xp_required - base;
  const pct = span > 0 ? Math.min(100, Math.max(0, ((xp - base) / span) * 100)) : 0;
  return { current, next, pct, remaining: Math.max(0, next.xp_required - xp) };
}
