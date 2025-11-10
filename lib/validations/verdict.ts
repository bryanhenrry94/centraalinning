import { z } from "zod";
import { VerdictInterestCreateSchema } from "@/lib/validations/verdict-interest";
import { DebtorBaseSchema } from "@/lib/validations/debtor";
import {
  VerdictEmbargoBaseSchema,
  VerdictEmbargoCreateSchema,
} from "./verdict-embargo";
import { VerdictAttachmentSchema } from "./verdict-attachments";
import { VerdictBailiffServicesCreateSchema } from "./verdict-bailiff-services";

// Enum for VerdictStatus
export const VerdictStatusEnum = z.enum([
  "DRAFT",
  "PENDING",
  "APPROVED",
  "REJECTED",
]);

// Verdict schema
const VerdictBaseSchema = z.object({
  id: z.string().uuid({ message: "El id debe ser un UUID válido." }),
  invoice_number: z.string().max(100),
  creditor_name: z.string().max(100, {
    message: "El nombre del acreedor no debe exceder 100 caracteres.",
  }),
  debtor_id: z.string(),
  registration_number: z.string().max(100, {
    message: "El número de registro no debe exceder 100 caracteres.",
  }),
  sentence_amount: z.preprocess(
    (val) => (typeof val === "string" ? Number(val) : val),
    z.number()
  ),
  sentence_date: z.preprocess(
    (val) =>
      typeof val === "string" || val instanceof Date ? new Date(val) : val,
    z.date()
  ),
  procesal_cost: z.preprocess(
    (val) => (typeof val === "string" ? Number(val) : val),
    z.number().optional()
  ),
  verdict_interest: z.array(VerdictInterestCreateSchema).optional(),
  verdict_embargo: z.array(VerdictEmbargoCreateSchema).optional(),
  bailiff_id: z.preprocess(
    (val) => (val === "" ? null : val),
    z
      .string()
      .uuid({ message: "El id del alguacil debe ser un UUID válido." })
      .nullable()
  ),
  bailiff_services: z.array(VerdictBailiffServicesCreateSchema).optional(),
  status: VerdictStatusEnum,
  attachments: z.array(VerdictAttachmentSchema).optional(),
  created_at: z.date().default(() => new Date()),
  updated_at: z.date().default(() => new Date()),
});

export const VerdictSchema = VerdictBaseSchema.superRefine((data, ctx) => {});

export const VerdictCreateSchema = VerdictBaseSchema.omit({
  id: true,
  // status: true,
  created_at: true,
  updated_at: true,
});

export const VerdictCreateForm = z.object({
  ...VerdictCreateSchema.shape,
});

export const VerdictUpdateSchema = VerdictBaseSchema.partial().extend({});

export const VerdictResponseSchema = VerdictBaseSchema.extend({
  debtor: DebtorBaseSchema,
  verdict_interest: z.array(VerdictInterestCreateSchema),
  verdict_embargo: z.array(VerdictEmbargoBaseSchema),
});

// Types
export type VerdictStatus = z.infer<typeof VerdictStatusEnum>;
export type Verdict = z.infer<typeof VerdictSchema>;
export type VerdictResponse = z.infer<typeof VerdictResponseSchema>;
export type VerdictCreate = z.infer<typeof VerdictCreateSchema>;
export type VerdictUpdate = z.infer<typeof VerdictUpdateSchema>;
