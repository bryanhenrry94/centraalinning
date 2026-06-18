import { z } from "zod";

export const createBlockadeSchema = z.object({
  debtorId: z.string().min(1, "Debe seleccionar un deudor"),

  amount: z.number().positive("El monto debe ser mayor a cero"),

  reason: z.enum(["UNPAID_PAYMENT"]),

  documents: z
    .array(z.instanceof(File))
    .min(1, "Debe adjuntar al menos un documento"),
});

export type CreateBlockadeInput = z.infer<typeof createBlockadeSchema>;
