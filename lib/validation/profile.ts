import { z } from "zod";

export const onboardingSchema = z.object({
  base_currency: z.string().length(3),
  first_pocket_name: z.string().min(1).max(60).optional(),
});
export type OnboardingInput = z.infer<typeof onboardingSchema>;

export const settingsSchema = z.object({
  display_currency: z.string().length(3),
});
export type SettingsInput = z.infer<typeof settingsSchema>;
