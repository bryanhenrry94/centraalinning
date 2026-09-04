import { z } from "zod";
import { IdentificationType, PersonType } from "./person.service";

export const PersonSchema = z.object({
  id: z.string().uuid().optional(),
  person_type: z.enum(PersonType),
  identification_type: z.enum(IdentificationType),
  identification: z.string().min(1, "Het identificatienummer is verplicht"),
  first_name: z.string().optional().nullable(),
  middle_name: z.string().optional().nullable(),
  last_name: z.string().optional().nullable(),
  business_name: z.string().optional().nullable(),
  email: z.email().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  birth_date: z.coerce.date().optional().nullable(),
  birth_place: z.string().optional().nullable(),
});

export const PersonSummarySchema = PersonSchema.pick({
  id: true,
  person_type: true,
  identification_type: true,
  identification: true,
  first_name: true,
  middle_name: true,
  last_name: true,
  business_name: true,
  email: true,
  phone: true,
  address: true,
});

export const PersonCreateSchema = PersonSchema.omit({
  // id: true,
});

// Type exports
export type PersonInput = z.infer<typeof PersonSchema>;
export type PersonSummary = z.infer<typeof PersonSummarySchema>;
export type PersonCreateInput = z.infer<typeof PersonCreateSchema>;
