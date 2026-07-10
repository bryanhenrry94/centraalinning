import { z } from "zod";

export const BlockadeDocumentSchema = z.object({
  file: z.instanceof(File),
  fileName: z.string().min(1),
  originalName: z.string().min(1),
  mimeType: z.string().min(1),
  size: z.number().positive(),
  storageKey: z.string().optional(), // este campo es opcional porque en el frontend aún no se genera un storageKey real
});

export const BlockadeSchema = z.object({
  debtorId: z.string().min(1, "Debe seleccionar un deudor"),

  amount: z.number().positive("El monto debe ser un número positivo"),

  reason: z.enum(["UNPAID_PAYMENT"]),

  registeredAt: z.date().optional(),

  status: z.enum(["DRAFT", "ACTIVE", "SUSPENDED"]).optional(),

  paymentId: z.string().optional(),

  documents: z
    .array(BlockadeDocumentSchema)
    .min(1, "Debe adjuntar al menos un documento"),
});

export type CreateBlockadeInput = z.infer<typeof BlockadeSchema>;
export type BlockadeDocument = z.infer<typeof BlockadeDocumentSchema>;
