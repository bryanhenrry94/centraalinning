import { z } from "zod";

export const BlockadeDocumentSchema = z.object({
  file: z.instanceof(File),
  fileName: z.string().min(1),
  originalName: z.string().min(1),
  mimeType: z.string().min(1),
  size: z.number().positive(),
  storageKey: z.string().optional(), // este campo es opcional porque en el frontend aún no se genera un storageKey real
});

// Motivos que requieren una nota explicando el contexto además del motivo
// en sí — no alcanza con el enum solo.
const REASONS_REQUIRING_NOTE = ["EXTERNAL_PROCEDURE_COMPLETED", "OTHER"] as const;

export const BlockadeSchema = z
  .object({
    debtorId: z.string().min(1, "U dient een debiteur te selecteren"),

    amount: z.number().positive("Het bedrag moet een positief getal zijn"),

    reason: z.enum(["UNPAID_PAYMENT", "EXTERNAL_PROCEDURE_COMPLETED", "OTHER"]),

    // Obligatoria cuando el motivo es "trayecto externo completado" u
    // "otro" — describe qué trayecto/evidencia respalda el bloqueo directo.
    reasonNote: z.string().nullable().optional(),

    registeredAt: z.date().optional(),

    status: z.enum(["DRAFT", "ACTIVE", "SUSPENDED"]).optional(),

    paymentId: z.string().optional(),

    documents: z
      .array(BlockadeDocumentSchema)
      .min(1, "U dient minstens één document bij te voegen"),

    // Confirmación explícita: quien registra declara que la información y
    // los documentos adjuntos son verídicos (ruta directa, sin pasar por
    // AOP/GOP, así que no hay otra verificación previa del sistema).
    confirmed: z.boolean(),
  })
  .refine(
    (data) =>
      !REASONS_REQUIRING_NOTE.includes(data.reason as (typeof REASONS_REQUIRING_NOTE)[number]) ||
      !!data.reasonNote?.trim(),
    { message: "Beschrijf de reden van de blokkade.", path: ["reasonNote"] },
  )
  .refine((data) => data.confirmed === true, {
    message: "U moet bevestigen dat de gegevens juist zijn voordat u doorgaat.",
    path: ["confirmed"],
  });

export type CreateBlockadeInput = z.infer<typeof BlockadeSchema>;
export type BlockadeDocument = z.infer<typeof BlockadeDocumentSchema>;
