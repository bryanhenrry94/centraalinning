import { z } from "zod";

export const ALLOWED_RECEIPT_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "application/pdf",
];

export const MAX_RECEIPT_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export const initiateTransferPaymentSchema = z.object({
  debtClaimId: z.string().min(1, "La deuda es obligatoria"),
  tenantId: z.string().uuid(),
  debtorEmail: z.string().email("Ongeldig e-mailadresformaat"),
  amount: z.coerce.number().positive("El monto debe ser mayor a 0"),
  referenceNumber: z
    .string()
    .min(1, "Het bewijsnummer is verplicht"),
});

export type InitiateTransferPayment = z.infer<
  typeof initiateTransferPaymentSchema
>;

export const rejectTransferPaymentSchema = z.object({
  token: z.string().min(1),
  reason: z.string().optional(),
});

export type RejectTransferPayment = z.infer<typeof rejectTransferPaymentSchema>;
