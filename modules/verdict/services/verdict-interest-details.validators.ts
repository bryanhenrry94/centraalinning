import { z } from "zod";

export const VerdictInterestDetailSchema = z.object({
  id: z.string().uuid(),
  period: z.string().min(1),
  period_start: z.date(),
  period_end: z.date(),
  days: z.number().int().min(0),
  annual_rate: z.number(),
  proportional_rate: z.number(),
  base_amount: z.number(),
  interest: z.number(),
  total: z.number(),
  verdict_interest_id: z.string().uuid(),
  created_at: z.date().default(() => new Date()),
  updated_at: z.date().default(() => new Date()),
});

export const VerdictInterestDetailCreateSchema =
  VerdictInterestDetailSchema.omit({
    id: true,
    created_at: true,
    updated_at: true,
    verdict_interest_id: true,
  });

export type VerdictInterestDetail = z.infer<typeof VerdictInterestDetailSchema>;
export type VerdictInterestDetailCreate = z.infer<
  typeof VerdictInterestDetailCreateSchema
>;
