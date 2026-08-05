import { z } from "zod";

export const agreementSchema = z.object({
  id: z.string().cuid(),
  debtClaim_id: z.string().cuid(),
  legalProcessId: z.string().optional().nullable(),
  caseTransferId: z.string().optional().nullable(),
  tenant_id: z.string().uuid(),
  total_amount: z.number(),
  installment_amount: z.number(),
  installments_count: z.number().int(),
  start_date: z.date(),
  end_date: z.date(),
  comment: z.string().optional().nullable(),
  rejection_reason: z.string().optional().nullable(),
  status: z.string(),
  created_at: z.date().optional(),
  updated_at: z.date().optional(),
  debtor_id: z.string().nullable().optional(),
});

export const createAgreementSchema = agreementSchema.omit({
  id: true,
  tenant_id: true,
  created_at: true,
  updated_at: true,
  rejection_reason: true,
});

export const updateAgreementSchema = createAgreementSchema.partial().extend({
  rejection_reason: z.string().optional().nullable(),
});

export const agreementResponseSchema = agreementSchema.extend({
  debtClaim_reference: z.string().optional().nullable(),
  debtor: z
    .object({
      id: z.string().cuid(),
      fullname: z.string(),
      email: z.string().email().optional().nullable(),
      phone: z.string().optional().nullable(),
      personal_number: z.string().optional().nullable(),
    })
    .nullable()
    .optional(),
});

export type Agreement = z.infer<typeof agreementSchema>;
export type AgreementResponse = z.infer<typeof agreementResponseSchema>;
export type CreateAgreement = z.infer<typeof createAgreementSchema>;
export type UpdateAgreement = z.infer<typeof updateAgreementSchema>;
