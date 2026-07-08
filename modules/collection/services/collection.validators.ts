import { z } from "zod";

export const DebtClaimSchema = z.object({
  id: z.string().cuid(),
  tenantId: z.string(),
  debtorId: z.string(),
  reference: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  principalAmount: z.number(),
  currentAmount: z.number(),
  currency: z.string(),
  origin: z.enum(["FAR", "MANUAL", "IMPORT", "API"]),
  status: z.enum(["OPEN", "IN_PROGRESS", "SETTLED", "CLOSED", "CANCELLED"]),
  createdAt: z.date(),
  updatedAt: z.date(),
  closedAt: z.date().optional().nullable(),
});

export const DebtClaimCreateSchema = DebtClaimSchema.omit({
  id: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
  closedAt: true,
}).extend({
  debtorId: z.string().min(1, "Debiteur is verplicht"),
  principalAmount: z.number().positive("Vorderingsbedrag moet groter zijn dan 0"),
});

export const DebtClaimUpdateSchema = DebtClaimCreateSchema.partial();

export const AopStepEnum = z.enum([
  "REMINDER",
  "FINAL_NOTICE",
  "DEFAULT_NOTICE",
  "BLK_NOTIFICATION",
]);
export type AopStep = z.infer<typeof AopStepEnum>;

export const DebtClaimResponseSchema = DebtClaimSchema.extend({
  debtor: z.object({
    id: z.string(),
    fullname: z.string(),
    email: z.string(),
    total_income: z.number().optional(),
  }),
  aopStep: AopStepEnum.nullable().optional(),
});

export type DebtClaim = z.infer<typeof DebtClaimSchema>;
export type DebtClaimCreate = z.infer<typeof DebtClaimCreateSchema>;
export type DebtClaimUpdate = z.infer<typeof DebtClaimUpdateSchema>;
export type DebtClaimResponse = z.infer<typeof DebtClaimResponseSchema>;

// Legacy alias
export const DebtClaimViewSchema = DebtClaimResponseSchema;
export type DebtClaimView = DebtClaimResponse;
