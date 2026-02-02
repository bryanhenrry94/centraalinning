import { z } from "zod";

export const PaymentMethodEnum = z.enum(["TRANSFER", "CREDIT_CARD"]);
export type PaymentMethod = z.infer<typeof PaymentMethodEnum>;

export const PaymentSchema = z.object({
  id: z.string(),
  debt_id: z.string(),
  paid_at: z
    .union([z.string(), z.date()])
    .transform((date) => (date instanceof Date ? date.toISOString() : date)),
  total_amount: z.preprocess(
    (val) => (typeof val === "string" ? Number(val) : val),
    z.number()
  ),
  method: PaymentMethodEnum,
  reference_number: z.string().optional(),
  created_at: z.date().optional(),
  updated_at: z.date().optional(),
});

export const PaymentCreateSchema = PaymentSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type Payment = z.infer<typeof PaymentSchema>;
export type PaymentCreate = z.infer<typeof PaymentCreateSchema>;
