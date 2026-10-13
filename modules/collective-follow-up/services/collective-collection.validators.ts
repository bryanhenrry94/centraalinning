import { z } from "zod";
import { PersonType } from "@/shared/constants/person-type";
import { IdentificationType } from "@/shared/constants/identification-type";

// Directe COP (CCP-document "Directe COP en Directe GOP", §2): geen
// voorafgaand CFSB-AOP nodig, maar eerdere administratieve opvolging moet
// aantoonbaar zijn — vandaar de verplichte documenten. Mismo patrón que
// NewBlockadeDebtorSchema/BlockadeSchema (BLK directo).
export const NewDirectCopDebtorSchema = z.object({
  person_type: z.enum(PersonType),
  identification_type: z.enum(IdentificationType),
  identification: z.string().min(1, "Het identificatienummer is verplicht"),
  fullname: z.string().min(1, "De naam is verplicht"),
  email: z.email({ message: "Het e-mailadres is niet geldig." }),
  phone: z.string().optional(),
  address: z.string().optional(),
});

export const DirectCopDocumentSchema = z.object({
  file: z.instanceof(File),
  fileName: z.string().min(1),
  originalName: z.string().min(1),
  mimeType: z.string().min(1),
  size: z.number().positive(),
});

export const DirectCopSchema = z
  .object({
    debtorId: z.string().optional(),
    newDebtor: NewDirectCopDebtorSchema.optional(),

    outstandingAmount: z.number().positive("Bedrag moet groter zijn dan 0."),
    description: z.string().min(1, "De omschrijving/grondslag is verplicht"),
    originalObligationDate: z.date({ error: "De datum van de oorspronkelijke verplichting is verplicht" }),

    documents: z
      .array(DirectCopDocumentSchema)
      .min(1, "U dient minstens één bewijsstuk van eerdere administratieve opvolging bij te voegen"),

    confirmed: z.boolean(),
  })
  .refine((data) => data.confirmed === true, {
    message: "U moet bevestigen dat de gegevens juist zijn voordat u doorgaat.",
    path: ["confirmed"],
  })
  .refine((data) => !!data.debtorId || !!data.newDebtor, {
    message: "Selecteer een bestaande debiteur of vul de gegevens van een nieuwe debiteur in.",
    path: ["debtorId"],
  });

export type CreateDirectCopInput = z.infer<typeof DirectCopSchema>;
export type DirectCopDocument = z.infer<typeof DirectCopDocumentSchema>;

export const StartCollectiveCollectionSchema = z.object({
  debtClaimId: z.string().min(1),
});
export type StartCollectiveCollectionInput = z.infer<typeof StartCollectiveCollectionSchema>;

export const RequestPaymentAgreementSchema = z.object({
  collectionId: z.string().min(1),
  installmentsCount: z.coerce.number().int().positive("Het aantal termijnen moet groter zijn dan 0"),
  startDate: z.coerce.date(),
  notes: z.string().nullable().optional(),
});
export type RequestPaymentAgreementInput = z.infer<typeof RequestPaymentAgreementSchema>;

export const DecideNegotiationSchema = z
  .object({
    negotiationId: z.string().min(1),
    action: z.enum(["ACCEPT", "ACCEPT_MODIFIED", "REJECT"]),
    acceptedAmount: z.coerce.number().positive().nullable().optional(),
    notes: z.string().nullable().optional(),
  })
  .refine((data) => data.action !== "ACCEPT_MODIFIED" || data.acceptedAmount != null, {
    message: "Vermeld het aangepaste bedrag.",
    path: ["acceptedAmount"],
  })
  .refine((data) => data.action !== "ACCEPT_MODIFIED" || !!data.notes?.trim(), {
    message: "Leg uit waarom het bedrag werd aangepast.",
    path: ["notes"],
  })
  .refine((data) => data.action !== "REJECT" || !!data.notes?.trim(), {
    message: "Vermeld de reden van afwijzing.",
    path: ["notes"],
  });
export type DecideNegotiationInput = z.infer<typeof DecideNegotiationSchema>;

export const CloseCollectiveCollectionSchema = z.object({
  collectionId: z.string().min(1),
  reason: z.string().min(1, "De reden voor sluiting is verplicht"),
});
export type CloseCollectiveCollectionInput = z.infer<typeof CloseCollectiveCollectionSchema>;

export const SetAutoContinueSchema = z.object({
  enabled: z.boolean(),
});
export type SetAutoContinueInput = z.infer<typeof SetAutoContinueSchema>;

export const SubmitNetworkResponseSchema = z.object({
  queryId: z.string().min(1),
  answer: z.enum(["YES", "NO"]),
});
export type SubmitNetworkResponseInput = z.infer<typeof SubmitNetworkResponseSchema>;
