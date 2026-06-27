import { z } from "zod";

// Server-side validation for a new entry. amount is always positive and in the
// source pocket's currency; transfers require a distinct destination pocket.
export const entrySchema = z
  .object({
    type: z.enum(["deposit", "withdraw", "transfer"]),
    category_id: z.uuid(),
    amount: z.coerce.number().positive(),
    to_category_id: z.uuid().nullable().optional(),
    note: z.string().max(280).nullable().optional(),
    occurred_at: z.coerce.date().optional(),
  })
  .refine(
    (d) =>
      d.type !== "transfer" ||
      (!!d.to_category_id && d.to_category_id !== d.category_id),
    {
      message: "Transfer butuh kantong tujuan yang berbeda",
      path: ["to_category_id"],
    }
  );

export type EntryInput = z.infer<typeof entrySchema>;
