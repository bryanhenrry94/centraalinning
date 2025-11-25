import { z } from "zod";
import { DebtorSchema } from "@/lib/validations/debtor";
import { PaymentSchema } from "@/lib/validations/payment";
import { $Enums } from "@/prisma/generated/prisma";

export const CollectionCaseSchema = z.object({
  id: z.cuid(),
  reference_number: z.string().optional(),
  issue_date: z.date(),
  due_date: z.date(),
  tenant_id: z.string(),
  debtor_id: z.string(),
  amount_original: z.number(),
  fee_rate: z.number(),
  fee_amount: z.number(),
  abb_rate: z.number(),
  abb_amount: z.number(),
  total_fined: z.number().default(0),
  total_due: z.number().default(0),
  total_to_receive: z.number().default(0),
  total_paid: z.number().default(0),
  balance: z.number().default(0),
  status: z
    .enum([
      $Enums.CollectionCaseStatus.AANMANING,
      $Enums.CollectionCaseStatus.SOMMATIE,
      $Enums.CollectionCaseStatus.INGEBREKESTELLING,
      $Enums.CollectionCaseStatus.BLOKKADE,
    ])
    .default($Enums.CollectionCaseStatus.AANMANING),
  created_at: z.date(),
  updated_at: z.date(),
});

export const CollectionCaseCreateSchema = CollectionCaseSchema.omit({
  id: true,
  tenant_id: true,
  created_at: true,
  updated_at: true,
});

export const CollectionCaseUpdateSchema = CollectionCaseSchema.partial().omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const CollectionCaseResponseSchema = CollectionCaseSchema.extend({
  debtor: DebtorSchema,
});

export const CollectionCaseViewSchema = CollectionCaseSchema.extend({
  debtor: DebtorSchema,
});

export type CollectionCase = z.infer<typeof CollectionCaseSchema>;
export type CollectionCaseCreate = z.infer<typeof CollectionCaseCreateSchema>;
export type CollectionCaseUpdate = z.infer<typeof CollectionCaseUpdateSchema>;
export type CollectionCaseResponse = z.infer<
  typeof CollectionCaseResponseSchema
>;
export type CollectionCaseView = z.infer<typeof CollectionCaseViewSchema>;
