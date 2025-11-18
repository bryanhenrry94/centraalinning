import { z } from "zod";

export const personSchema = z.object({
  id: z.string().uuid().optional(),
  person_type: z.enum(["NATURAL", "JURIDICA"]),
  identification_type: z.enum([
    "DNI",
    "PASSPORT",
    "NIE",
    "CIF",
    "KVK",
    "OTHER",
  ]),
  identification: z.string().min(1, "La identificación es obligatoria"),
  first_name: z.string().min(1, "El nombre es obligatorio"),
  last_name: z.string().min(1, "El apellido es obligatorio"),
  email: z.string().email().optional().nullable(),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
});

export type PersonInput = z.infer<typeof personSchema>;
