import { z } from "zod";
import { VerdictInterestDetailCreateSchema } from "@/modules/verdict/services/verdict-interest-details.validators";

export const VerdictInterestBaseSchema = z.object({
  id: z.string().uuid({ message: "De id moet een geldige UUID zijn" }),
  interest_type: z.string("Het rentetype moet een geheel getal zijn"),
  base_amount: z.coerce
    .number()
    .nonnegative({ message: "Het basisbedrag moet een positief getal zijn" }),
  calculated_interest: z
    .preprocess(
      (val) => (typeof val === "string" ? Number(val) : val),
      z.number()
    )
    .optional(),
  calculation_start: z.coerce.date({
    message: "De startdatum van de berekening moet een geldige datum zijn",
  }),
  calculation_end: z.coerce.date({
    message: "De einddatum van de berekening moet een geldige datum zijn",
  }),
  total_interest: z.number(),
  details: z.array(VerdictInterestDetailCreateSchema),
});

export const VerdictInterestSchema = VerdictInterestBaseSchema.extend({
  id: z.string().uuid({ message: "De id moet een geldige UUID zijn" }),
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
