import { z } from "zod";
import { VerdictInterestDetailCreateSchema } from "@/modules/verdict/services/verdict-interest-details.validators";
import { GopInactiveReason } from "@/modules/legal-process/constants/legal-process-status";

export const VerdictInterestInputSchema = z.object({
  interest_type: z.string().min(1),
  base_amount: z.coerce.number(),
  calculated_interest: z.coerce.number().optional(),
  calculation_start: z.coerce.date(),
  calculation_end: z.coerce.date(),
  total_interest: z.coerce.number(),
  details: z.array(VerdictInterestDetailCreateSchema).default([]),
});
export type VerdictInterestInput = z.infer<typeof VerdictInterestInputSchema>;

// El participante transfiere siempre a UNA sola parte: un abogado o un
// alguacil, nunca ambos a la vez ni ninguno.
export const TransferToLawyerSchema = z
  .object({
    debtClaimId: z.string().min(1),
    lawyerId: z.string().nullable().optional(),
    bailiffId: z.string().nullable().optional(),
  })
  .refine((data) => Boolean(data.lawyerId) !== Boolean(data.bailiffId), {
    message: "Selecteer een advocaat of een deurwaarder, niet beide en niet geen van beide.",
  });
export type TransferToLawyerInput = z.infer<typeof TransferToLawyerSchema>;

export const RejectTransferSchema = z.object({
  legalProcessId: z.string().min(1),
  reason: z.string().min(1, "El motivo del rechazo es obligatorio"),
});
export type RejectTransferInput = z.infer<typeof RejectTransferSchema>;

export const RegisterVerdictSchema = z.object({
  legalProcessId: z.string().min(1),
  invoice_number: z.string().min(1),
  creditor_name: z.string().min(1),
  registration_number: z.string().min(1),
  sentence_amount: z.coerce.number().positive(),
  sentence_date: z.coerce.date(),
  court: z.string().nullable().optional(),
  notification_date: z.coerce.date().nullable().optional(),
  prescription_term_months: z.coerce.number().int().positive().nullable().optional(),
  prescription_due_date: z.coerce.date().nullable().optional(),
  procesal_cost: z.coerce.number().nonnegative().optional(),
  notes: z.string().nullable().optional(),
  bailiff_id: z.string().min(1),
  verdict_interest: z.array(VerdictInterestInputSchema).default([]),
});
export type RegisterVerdictInput = z.infer<typeof RegisterVerdictSchema>;

export const RegisterExecutionMeasureSchema = z.object({
  verdictId: z.string().min(1),
  // No todas las medidas de ejecución involucran a un tercero (p.ej. un
  // embargo de cuenta bancaria propia del deudor no tiene "empresa"), así
  // que estos campos quedan disponibles pero no obligatorios.
  company_name: z.string().default(""),
  company_phone: z.string().default(""),
  company_email: z.union([z.string().email(), z.literal("")]).default(""),
  company_address: z.string().default(""),
  embargo_type: z.string().min(1),
  embargo_date: z.coerce.date(),
  embargo_amount: z.coerce.number().nonnegative(),
  total_amount: z.coerce.number().nonnegative(),
});
export type RegisterExecutionMeasureInput = z.infer<typeof RegisterExecutionMeasureSchema>;

export const RegisterInterestUpdateSchema = z.object({
  verdictId: z.string().min(1),
  interest: VerdictInterestInputSchema,
});
export type RegisterInterestUpdateInput = z.infer<typeof RegisterInterestUpdateSchema>;

export const RegisterBailiffCostSchema = z.object({
  verdictId: z.string().min(1),
  service_invoice_number: z.string().min(1),
  service_type: z.string().min(1),
  service_cost: z.coerce.number().positive(),
});
export type RegisterBailiffCostInput = z.infer<typeof RegisterBailiffCostSchema>;

export const MarkInactiveSchema = z.object({
  legalProcessId: z.string().min(1),
  reason: z.nativeEnum(GopInactiveReason),
  reviewDate: z.coerce.date(),
  notes: z.string().nullable().optional(),
});
export type MarkInactiveInput = z.infer<typeof MarkInactiveSchema>;

export const ChangeBailiffSchema = z.object({
  legalProcessId: z.string().min(1),
  newBailiffId: z.string().min(1),
});
export type ChangeBailiffInput = z.infer<typeof ChangeBailiffSchema>;

export const CancelLegalProcessSchema = z.object({
  legalProcessId: z.string().min(1),
  reason: z.string().min(1, "El motivo de la cancelación es obligatorio"),
});
export type CancelLegalProcessInput = z.infer<typeof CancelLegalProcessSchema>;
