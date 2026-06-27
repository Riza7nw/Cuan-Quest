import { z } from "zod";

// Level thresholds are data-driven (never hardcoded in app logic). The leveling
// engine reads this table, so edits here directly change everyone's level math.
export const levelSchema = z.object({
  level: z.coerce.number().int().min(1).max(999),
  xp_required: z.coerce.number().min(0),
  title: z.string().min(1).max(60),
  badge_icon: z.string().max(40).nullable().optional(),
});
export type LevelInput = z.infer<typeof levelSchema>;
