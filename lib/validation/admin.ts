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

// A level number to delete. RLS still gates the write to admins; this guards the
// shape so a malformed value (NaN, float, string) can't reach the DELETE.
export const deleteLevelSchema = z.coerce.number().int().positive();

// Currency activate/deactivate. ISO-4217 shape (3 uppercase letters).
export const currencyActiveSchema = z.object({
  code: z.string().regex(/^[A-Z]{3}$/),
  active: z.boolean(),
});
