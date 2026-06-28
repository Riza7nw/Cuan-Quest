import { z } from "zod";

const currencyCode = z.string().regex(/^[A-Z]{3}$/, "Kode mata uang tidak valid");

export const onboardingSchema = z.object({
  base_currency: currencyCode,
  first_pocket_name: z.string().min(1).max(60).optional(),
});
export type OnboardingInput = z.infer<typeof onboardingSchema>;

export const settingsSchema = z.object({
  display_currency: currencyCode,
});
export type SettingsInput = z.infer<typeof settingsSchema>;
