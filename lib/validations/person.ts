import { z } from "zod";

export const personSchema = z.object({
  id: z.string().uuid().optional(),
  person_type: z.enum(["INDIVIDUAL", "COMPANY"]),
  identification_type: z.enum([
    "DNI",
    "PASSPORT",
    "NIE",
    "CIF",
    "KVK",
    "OTHER",
  ]),
  identification: z.string().min(1, "La identificación es obligatoria"),
  first_name: z.string().optional().nullable(),
  last_name: z.string().optional().nullable(),
  business_name: z.string().optional().nullable(),
  email: z.email().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
});

export const personSummarySchema = personSchema.pick({
  id: true,
  person_type: true,
  identification_type: true,
  identification: true,
  first_name: true,
  last_name: true,
  business_name: true,
});

export const personCreateSchema = personSchema.omit({
  // id: true,
});

export type PersonInput = z.infer<typeof personSchema>;
export type PersonSummary = z.infer<typeof personSummarySchema>;
export type PersonCreateInput = z.infer<typeof personCreateSchema>;
