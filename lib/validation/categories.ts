import { z } from "zod";

// Optional savings target in the pocket's own currency (display-only goal).
const targetAmount = z.number().positive().nullable().optional();

export const categoryCreateSchema = z.object({
  name: z.string().min(1).max(60),
  currency: z.string().length(3),
  icon: z.string().max(40).nullable().optional(),
  target_amount: targetAmount,
});
export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>;

// Currency is intentionally not editable here (locked once a pocket is funded).
export const categoryUpdateSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1).max(60),
  icon: z.string().max(40).nullable().optional(),
  target_amount: targetAmount,
});
export type CategoryUpdateInput = z.infer<typeof categoryUpdateSchema>;
