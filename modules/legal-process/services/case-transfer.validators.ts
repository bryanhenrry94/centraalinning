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
  reason: z.string().min(1, "De reden voor afwijzing is verplicht"),
});
export type RejectTransferInput = z.infer<typeof RejectTransferSchema>;

export const CancelCaseTransferSchema = z.object({
  caseTransferId: z.string().min(1),
  reason: z.string().min(1, "De reden voor annulering is verplicht"),
});
export type CancelCaseTransferInput = z.infer<typeof CancelCaseTransferSchema>;

export const CaseTransferOutcomeSchema = z.enum(["BUITENGERECHTELIJK", "GERECHTELIJK"]);
export type CaseTransferOutcome = z.infer<typeof CaseTransferOutcomeSchema>;

export const SubmitLawyerFeeInvoiceSchema = z
  .object({
    caseTransferId: z.string().min(1),
    outcome: CaseTransferOutcomeSchema,
    hasVerdict: z.boolean().nullable().optional(),
    completionDate: z.coerce.date(),
    totalAmount: z.coerce.number().positive(),
    verdictNumber: z.string().nullable().optional(),
    verdictDate: z.coerce.date().nullable().optional(),
    // Deurwaarder voor tenuitvoerlegging — alleen verplicht/relevant als er een
    // vonnis is. Wordt pas aan CaseTransfer.bailiffId gekoppeld en genotificeerd
    // nadat de CFSB-vergoeding betaald is (zie CaseTransferService).
    bailiffId: z.string().nullable().optional(),
  })
  .refine((data) => data.outcome !== "GERECHTELIJK" || typeof data.hasVerdict === "boolean", {
    message: "Geef aan of er een vonnis is.",
    path: ["hasVerdict"],
  })
  .refine(
    (data) => !(data.outcome === "GERECHTELIJK" && data.hasVerdict) || !!data.verdictNumber?.trim(),
    { message: "Vonnisnummer is verplicht.", path: ["verdictNumber"] },
  )
  .refine((data) => !(data.outcome === "GERECHTELIJK" && data.hasVerdict) || !!data.verdictDate, {
    message: "Datum vonnis is verplicht.",
    path: ["verdictDate"],
  })
  .refine((data) => !(data.outcome === "GERECHTELIJK" && data.hasVerdict) || !!data.bailiffId, {
    message: "Selecteer de deurwaarder voor tenuitvoerlegging.",
    path: ["bailiffId"],
  });
export type SubmitLawyerFeeInvoiceInput = z.infer<typeof SubmitLawyerFeeInvoiceSchema>;

// "Uitkomst registreren" voor de rechtstreekse deurwaarder-route (geen
// advocaat): enkel de "Geen vonnis"-afronding — als er wél een vonnis is,
// gebruikt de deurwaarder rechtstreeks "Vonnis registreren", niet dit
// formulier (zie CaseTransferService.submitLawyerFeeInvoice).
export const SubmitBailiffOutcomeInvoiceSchema = z.object({
  caseTransferId: z.string().min(1),
  outcome: CaseTransferOutcomeSchema,
  completionDate: z.coerce.date(),
  totalAmount: z.coerce.number().positive(),
});
export type SubmitBailiffOutcomeInvoiceInput = z.infer<typeof SubmitBailiffOutcomeInvoiceSchema>;
