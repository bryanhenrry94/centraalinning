import { z } from "zod";

export const PaymentAgreementSchema = z.object({
  id: z.string().cuid(),
  collection_case_id: z.string().optional().nullable(),
  verdict_id: z.string().optional().nullable(),
  tenant_id: z.uuid(),
  total_amount: z.number(),
  installment_amount: z.number(),
  installments_count: z.number().int(),
  start_date: z.date(),
  end_date: z.date(),
  comment: z.string().optional().nullable(),
  status: z.string(),
  created_at: z.date().optional(),
  updated_at: z.date().optional(),
  debtor_id: z.string().nullable().optional(),
});

export const PaymentAgreementCreateSchema = PaymentAgreementSchema.omit({
  id: true,
  tenant_id: true,
  created_at: true,
  updated_at: true,
});

export const PaymentAgreementUpdateSchema =
  PaymentAgreementCreateSchema.partial();

export const PaymentAgreementResponseSchema = PaymentAgreementSchema.extend({
  collection_case: z
    .object({
      id: z.string().cuid(),
      reference_number: z.string(),
      issue_date: z.date().optional().nullable(),
    })
    .optional(),
  debtor: z
    .object({
      id: z.string().cuid(),
      fullname: z.string(),
      email: z.string().email().optional().nullable(),
      phone: z.string().optional().nullable(),
    })
    .nullable()
    .optional(),
});

export type PaymentAgreement = z.infer<typeof PaymentAgreementSchema>;
export type PaymentAgreementResponse = z.infer<
  typeof PaymentAgreementResponseSchema
>;
export type PaymentAgreementCreate = z.infer<
  typeof PaymentAgreementCreateSchema
>;
export type PaymentAgreementUpdate = z.infer<
  typeof PaymentAgreementUpdateSchema
>;
