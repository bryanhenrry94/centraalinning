import { z } from "zod";
import { VerdictInterestDetailCreateSchema } from "./verdict-interest-details";

export const VerdictInterestBaseSchema = z.object({
  id: z.string().uuid({ message: "El id debe ser un UUID válido" }),
  interest_type: z.string("El tipo de interés debe ser un número entero"),
  base_amount: z.coerce
    .number()
    .nonnegative({ message: "El monto base debe ser un número positivo" }),
  calculated_interest: z
    .preprocess(
      (val) => (typeof val === "string" ? Number(val) : val),
      z.number()
    )
    .optional(),
  calculation_start: z.coerce.date({
    message: "La fecha de inicio de cálculo debe ser una fecha válida",
  }),
  calculation_end: z.coerce.date({
    message: "La fecha de fin de cálculo debe ser una fecha válida",
  }),
  total_interest: z.number(),
  details: z.array(VerdictInterestDetailCreateSchema),
});

export const VerdictInterestSchema = VerdictInterestBaseSchema.extend({
  id: z.string().uuid({ message: "El id debe ser un UUID válido" }),
  created_at: z.date().default(() => new Date()),
  updated_at: z.date().default(() => new Date()),
});

export const VerdictInterestCreateSchema = VerdictInterestSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type IVerdictInterest = z.infer<typeof VerdictInterestSchema>;
export type IVerdictInterestCreate = z.infer<
  typeof VerdictInterestCreateSchema
>;
