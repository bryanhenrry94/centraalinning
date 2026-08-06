import { z } from "zod";

export const VerdictEmbargoBaseSchema = z.object({
  id: z.string().uuid({ message: "De ID moet een geldige UUID zijn" }).optional(),
  verdict_id: z
    .string()
    .uuid({ message: "De Verdict-ID moet een geldige UUID zijn" })
    .optional(),
  company_name: z
    .string()
    .min(1, { message: "De bedrijfsnaam is verplicht" }),
  company_phone: z
    .string()
    .min(7, {
      message: "Het telefoonnummer van het bedrijf moet minstens 7 cijfers bevatten",
    })
    .max(20, {
      message: "Het telefoonnummer van het bedrijf mag maximaal 20 cijfers bevatten",
    }),
  company_email: z
    .string()
    .email({ message: "Ongeldig e-mailadres van het bedrijf" }),
  company_address: z
    .string()
    .min(1, { message: "Het adres van het bedrijf is verplicht" }),
  embargo_type: z
    .string()
    .min(1, { message: "Het type beslag is verplicht" }),
  embargo_date: z.coerce.date({
    message: "De beslagdatum moet een geldige datum zijn",
  }),
  embargo_amount: z
    .number()
    .nonnegative({ message: "Het beslagbedrag mag niet negatief zijn" }),
  total_amount: z
    .number()
    .nonnegative({ message: "Het totaalbedrag mag niet negatief zijn" }),
  created_at: z.coerce.date({
    message: "De aanmaakdatum moet een geldige datum zijn",
  }),
  updated_at: z.coerce.date({
    message: "De wijzigingsdatum moet een geldige datum zijn",
  }),
});

export const VerdictEmbargoCreateSchema = VerdictEmbargoBaseSchema.omit({
  id: true,
  verdict_id: true,
  created_at: true,
  updated_at: true,
});

export type VerdictEmbargo = z.infer<typeof VerdictEmbargoBaseSchema>;
export type VerdictEmbargoCreate = z.infer<typeof VerdictEmbargoCreateSchema>;
