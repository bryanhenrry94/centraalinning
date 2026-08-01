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

export const enum PaymentType {
  SUBSCRIPTION = "SUBSCRIPTION",
  CONTRACT_ACTIVATION = "CONTRACT_ACTIVATION",
  AGREEMENT_INSTALLMENT = "AGREEMENT_INSTALLMENT",
  DEBT_PAYMENT = "DEBT_PAYMENT",
  BLOK_CHECK = "BLOK_CHECK",
  FINANCIAL_REPORT = "FINANCIAL_REPORT",
  COLLECTION = "COLLECTION",
  GOP = "GOP",
  GOP_TRANSFER = "GOP_TRANSFER",
  GOP_LAWYER_FEE = "GOP_LAWYER_FEE",
  OTHER = "OTHER",
}

const PaymentTypeEnum = z.enum([
  PaymentType.SUBSCRIPTION,
  PaymentType.CONTRACT_ACTIVATION,
  PaymentType.AGREEMENT_INSTALLMENT,
  PaymentType.DEBT_PAYMENT,
  PaymentType.BLOK_CHECK,
  PaymentType.FINANCIAL_REPORT,
  PaymentType.COLLECTION,
  PaymentType.GOP,
  PaymentType.GOP_TRANSFER,
  PaymentType.GOP_LAWYER_FEE,
  PaymentType.OTHER,
]);

export const PaymentSchema = z.object({
  id: z.string(),
  tenant_id: z.string(),
  debtClaim_id: z.string().nullable().optional(),
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
  status: PaymentStatusEnum,
  provider: z.string(),
  provider_ref: z.string().nullable().optional(),
  provider_payload: z.string().nullable().optional(),
  payment_url: z.string().nullable().optional(),
  reference_number: z.string().optional(),
  agreement_id: z.string().nullable().optional(),
  contract_id: z.string().nullable().optional(),
  payment_type: PaymentTypeEnum,
  created_at: z.date(),
  updated_at: z.date(),
});

export const PaymentCreateSchema = PaymentSchema.omit({
  id: true,
  tenant_id: true,
  created_at: true,
  updated_at: true,
}).pick({
  debtClaim_id: true,
  paid_at: true,
  total_amount: true,
  method: true,
  status: true,
  provider: true,
  provider_ref: true,
  provider_payload: true,
  payment_url: true,
  reference_number: true,
  agreement_id: true,
  contract_id: true,
  payment_type: true,
});

export type Payment = z.infer<typeof PaymentSchema>;
export type PaymentCreate = z.infer<typeof PaymentCreateSchema>;
