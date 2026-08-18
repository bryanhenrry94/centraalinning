import { z } from "zod";

export const StartCollectiveCollectionSchema = z.object({
  debtClaimId: z.string().min(1),
});
export type StartCollectiveCollectionInput = z.infer<typeof StartCollectiveCollectionSchema>;

export const RequestPaymentAgreementSchema = z.object({
  collectionId: z.string().min(1),
  proposalAmount: z.coerce.number().positive("Het voorgestelde bedrag moet groter zijn dan 0"),
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
