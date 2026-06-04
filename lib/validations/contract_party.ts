import { z } from "zod";

export const ContractPartySchema = z.object({
  role: z.enum(["PARTY_A", "PARTY_B"]),

  full_name: z.string().trim().min(2, "Full name is required").max(255),

  identification: z
    .string()
    .trim()
    .min(1, "Identification is required")
    .max(50),

  email: z.string().trim().email("Invalid email address"),

  contact_person: z
    .string()
    .trim()
    .min(2, "Contact person is required")
    .max(255),

  phone: z.string().trim().min(5, "Phone number is required").max(50),

  birth_date: z.string().datetime().optional().nullable(),

  birth_place: z.string().trim().max(255).optional().nullable(),

  address: z.string().trim().max(500).optional().nullable(),
});

export type ContractPartyInput = z.infer<typeof ContractPartySchema>;
