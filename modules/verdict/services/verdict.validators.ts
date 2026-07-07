import { z } from "zod";
import { VerdictInterestCreateSchema } from "@/modules/verdict/services/verdict-interest.validators";
import {
  VerdictEmbargoBaseSchema,
  VerdictEmbargoCreateSchema,
} from "@/modules/verdict/services/verdict-embargo.validators";
import { VerdictAttachmentSchema } from "@/modules/verdict/services/verdict-attachments.validators";
import { VerdictBailiffServicesCreateSchema } from "@/modules/verdict/services/verdict-bailiff-services.validators";

// Enum for VerdictStatus
export const VerdictStatusEnum = z.enum([
  "DRAFT",
  "PENDING",
  "APPROVED",
  "REJECTED",
]);

// Verdict schema
const VerdictBaseSchema = z.object({
  id: z.string().uuid({ message: "De id moet een geldige UUID zijn." }),
  invoice_number: z.string({ message: "Het factuurnummer is verplicht." }),
  creditor_name: z
    .string({ message: "De naam van de schuldeiser is verplicht." })
    .max(100, {
      message:
        "De naam van de schuldeiser mag niet langer zijn dan 100 tekens.",
    }),
  debtor_id: z.string(),
  registration_number: z.string().max(100, {
    message: "Het registratienummer mag maximaal 100 tekens lang zijn.",
  }),
  sentence_amount: z.preprocess(
    (val) => (typeof val === "string" ? Number(val) : val),
    z.number(),
  ),
  sentence_date: z.preprocess(
    (val) =>
      typeof val === "string" || val instanceof Date ? new Date(val) : val,
    z.date(),
  ),
  procesal_cost: z.preprocess(
    (val) => (typeof val === "string" ? Number(val) : val),
    z.number().optional(),
  ),
  verdict_interest: z.array(VerdictInterestCreateSchema).optional(),
  verdict_embargo: z.array(VerdictEmbargoCreateSchema).optional(),
  bailiff_id: z.preprocess(
    (val) => (val === "" ? null : val),
    z
      .string({ message: "Selecteer een deurwaarder" })
      .uuid({ message: "Selecteer een geldige deurwaarder" }),
  ),
  bailiff_services: z.array(VerdictBailiffServicesCreateSchema).optional(),
  status: VerdictStatusEnum,
  attachments: z.array(VerdictAttachmentSchema).optional(),
  created_at: z.date(),
  updated_at: z.date(),
});

export const VerdictSchema = VerdictBaseSchema.superRefine((data, ctx) => {});

export const VerdictCreateSchema = VerdictBaseSchema.omit({
  id: true,
  // status: true,
  created_at: true,
  updated_at: true,
});

export const VerdictCreateFormSchema = z.object({
  ...VerdictCreateSchema.shape,
});

export const VerdictUpdateSchema = VerdictBaseSchema.partial().extend({});

export const VerdictResponseSchema = VerdictBaseSchema.extend({
  debtor: z
    .object({
      id: z.string(),
      tenant_id: z.string(),
      user_id: z.string().nullable(),
      person_id: z.string().nullable(),
      email: z
        .string()
        .email({ message: "El correo electrónico no es válido." }),
      fullname: z.string(),
      total_income: z
        .preprocess(
          (val) => (typeof val === "string" ? Number(val) : val),
          z.number(),
        )
        .optional(),
    })
    .optional(),
  verdict_interest: z.array(VerdictInterestCreateSchema),
  verdict_embargo: z.array(VerdictEmbargoBaseSchema),
});

export const VerdictJudgmentSchema = VerdictBaseSchema.pick({
  id: true,
  invoice_number: true,
  creditor_name: true,
  debtor_id: true,
  registration_number: true,
  sentence_amount: true,
  sentence_date: true,
  procesal_cost: true,
});

// Types
export type VerdictStatus = z.infer<typeof VerdictStatusEnum>;
export type Verdict = z.infer<typeof VerdictSchema>;
export type VerdictResponse = z.infer<typeof VerdictResponseSchema>;
export type VerdictCreate = z.infer<typeof VerdictCreateSchema>;
export type VerdictUpdate = z.infer<typeof VerdictUpdateSchema>;
export type VerdictCreateForm = z.infer<typeof VerdictCreateFormSchema>;
export type VerdictJudgment = z.infer<typeof VerdictJudgmentSchema>;
