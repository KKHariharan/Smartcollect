import { z } from 'zod';

export const updateSettingsSchema = z.object({
  company: z
    .object({
      name: z.string().trim().min(1).max(150).optional(),
      address: z.string().trim().max(300).optional(),
      phone: z.string().trim().max(20).optional(),
      email: z.string().trim().email().optional(),
      logoUrl: z.string().trim().url().optional(),
    })
    .optional(),
  interest: z
    .object({
      defaultInterestRate: z.coerce.number().min(0).max(100).optional(),
      defaultPenaltyChargePerDay: z.coerce.number().min(0).optional(),
    })
    .optional(),
  receipt: z
    .object({
      prefix: z.string().trim().min(1).max(10).optional(),
      footerNote: z.string().trim().max(300).optional(),
    })
    .optional(),
});
export type UpdateSettingsDto = z.infer<typeof updateSettingsSchema>;
