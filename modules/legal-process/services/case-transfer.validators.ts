import { z } from "zod";

// El participante transfiere siempre a UNA sola parte: un abogado o un
// alguacil, nunca ambos a la vez ni ninguno.
export const TransferToLawyerSchema = z
  .object({
    debtClaimId: z.string().min(1),
    lawyerId: z.string().nullable().optional(),
    bailiffId: z.string().nullable().optional(),
    // AT-013: noodoverdracht — transferencia de urgencia por fallecimiento o
    // incapacidad del abogado/alguacil que venía llevando el expediente.
    isEmergencyTransfer: z.boolean().optional().default(false),
    emergencyReason: z.string().nullable().optional(),
  })
  .refine((data) => Boolean(data.lawyerId) !== Boolean(data.bailiffId), {
    message: "Selecteer een advocaat of een deurwaarder, niet beide en niet geen van beide.",
  })
  .refine((data) => !data.isEmergencyTransfer || !!data.emergencyReason?.trim(), {
    message: "Vermeld de reden van de noodoverdracht.",
    path: ["emergencyReason"],
  });
export type TransferToLawyerInput = z.infer<typeof TransferToLawyerSchema>;

export const RejectTransferSchema = z.object({
  caseTransferId: z.string().min(1),
  reason: z.string().min(1, "El motivo del rechazo es obligatorio"),
});
export type RejectTransferInput = z.infer<typeof RejectTransferSchema>;

export const CancelCaseTransferSchema = z.object({
  caseTransferId: z.string().min(1),
  reason: z.string().min(1, "El motivo de la cancelación es obligatorio"),
});
export type CancelCaseTransferInput = z.infer<typeof CancelCaseTransferSchema>;

export const SubmitLawyerFeeInvoiceSchema = z.object({
  caseTransferId: z.string().min(1),
  totalAmount: z.coerce.number().positive(),
  invoiceNumber: z.string().nullable().optional(),
  invoiceDate: z.coerce.date().nullable().optional(),
});
export type SubmitLawyerFeeInvoiceInput = z.infer<typeof SubmitLawyerFeeInvoiceSchema>;

export const AssignBailiffForExecutionSchema = z.object({
  caseTransferId: z.string().min(1),
  bailiffId: z.string().min(1),
});
export type AssignBailiffForExecutionInput = z.infer<typeof AssignBailiffForExecutionSchema>;
