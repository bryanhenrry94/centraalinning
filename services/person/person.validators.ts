import { z } from "zod";
import { IdentificationType, PersonType } from "./person.service";

export const PersonSchema = z.object({
  id: z.string().uuid().optional(),
  person_type: z.enum(PersonType),
  identification_type: z.enum(IdentificationType),
  identification: z.string().min(1, "La identificación es obligatoria"),
  first_name: z.string().optional().nullable(),
  last_name: z.string().optional().nullable(),
  business_name: z.string().optional().nullable(),
  email: z.email().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  birth_date: z.coerce.date().optional().nullable(),
  birth_place: z.string().optional().nullable(),
  has_blockade: z.boolean().optional(),
});

export const PersonSummarySchema = PersonSchema.pick({
  id: true,
  person_type: true,
  identification_type: true,
  identification: true,
  first_name: true,
  last_name: true,
  business_name: true,
});

export const PersonCreateSchema = PersonSchema.omit({
  // id: true,
});
