import { z } from "zod";

export const ContractPartySchema = z.object({
  role: z.enum(["PARTY_A", "PARTY_B"]),

  person_type: z.enum(["INDIVIDUAL", "COMPANY"]),

  identification: z.string().trim().min(1, "Identificatie is vereist").max(50),

  full_name: z.string().trim().min(2, "Volledige naam is vereist").max(255),

  email: z.string().trim().email("Ongeldig e-mailadres"),

  phone: z.string().trim().min(5, "Telefoonnummer is vereist").max(50),

  birth_date: z
    .string()
    .datetime("Ongeldige geboortedatum")
    .optional()
    .nullable(),

  birth_place: z.string().trim().max(255).optional().nullable(),

  address: z
    .string()
    .trim()
    .min(1, "Adres is vereist")
    .max(500, "Adres is te lang"),
});

export type ContractPartyInput = z.infer<typeof ContractPartySchema>;
