import { z } from "zod";

export const agreementSchema = z.object({
  id: z.string().cuid(),
  debtClaim_id: z.string().cuid(),
  tenant_id: z.string().uuid(),
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

export const createAgreementSchema = agreementSchema.omit({
  id: true,
  tenant_id: true,
  created_at: true,
  updated_at: true,
});

export const updateAgreementSchema = createAgreementSchema.partial();

export const agreementResponseSchema = agreementSchema.extend({
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

export type Agreement = z.infer<typeof agreementSchema>;
export type AgreementResponse = z.infer<typeof agreementResponseSchema>;
export type CreateAgreement = z.infer<typeof createAgreementSchema>;
export type UpdateAgreement = z.infer<typeof updateAgreementSchema>;
