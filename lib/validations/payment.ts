import { z } from "zod";

export const PaymentMethodEnum = z.enum(["TRANSFER", "CREDIT_CARD"]);
export type PaymentMethod = z.infer<typeof PaymentMethodEnum>;

export const PaymentStatusEnum = z.enum([
  "pending",
  "completed",
  "failed",
  "cancelled",
]);
export type PaymentStatus = z.infer<typeof PaymentStatusEnum>;

export const PaymentSentooStatusEnum = z.enum([
  "pending",
  "processing",
  "completed",
  "failed",
  "rejected",
]);
export type PaymentSentooStatus = z.infer<typeof PaymentSentooStatusEnum>;

export const PaymentSchema = z.object({
  id: z.string(),
  debt_id: z.string().nullable().optional(),
  paid_at: z
    .union([z.string(), z.date()])
    .nullable()
    .optional()
    .transform((date) => (date instanceof Date ? date.toISOString() : date)),
  total_amount: z.preprocess(
    (val) => (typeof val === "string" ? Number(val) : val),
    z.number(),
  ),
  method: PaymentMethodEnum,
  status: PaymentStatusEnum.default("pending"),
  provider: z.string().default("sentoo"),
  provider_ref: z.string().nullable().optional(),
  provider_status: PaymentSentooStatusEnum.default("pending"),
  provider_payload: z.string().nullable().optional(),
  reference_number: z.string().optional(),
  agreement_id: z.string().nullable().optional(),
  created_at: z.date(),
  updated_at: z.date(),
});

export const PaymentCreateSchema = PaymentSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
  provider_status: true,
}).pick({
  debt_id: true,
  paid_at: true,
  total_amount: true,
  method: true,
  status: true,
  provider: true,
  provider_ref: true,
  provider_payload: true,
  reference_number: true,
  agreement_id: true,
});

export type Payment = z.infer<typeof PaymentSchema>;
export type PaymentCreate = z.infer<typeof PaymentCreateSchema>;
