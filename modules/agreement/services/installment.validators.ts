import { z } from "zod";

export const InstallmentSchema = z.object({
  id: z.string().cuid(),
  agreement_id: z.string().cuid(),
  number: z.number().int().nonnegative(),
  due_date: z.coerce.date(),
  amount: z.number(),
  status: z.string().default("PENDING"),
  payment_id: z.string().optional().nullable(),
  created_at: z.coerce.date().optional(),
  updated_at: z.coerce.date().optional(),
});

export type Installment = z.infer<typeof InstallmentSchema>;
