import { PersonSchema } from "@/services/person/person.validators";
import { z } from "zod";

export const debtorSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().min(1),
  person_id: z.string().min(1),
  user_id: z.string().uuid().nullable().optional(),
  email: z.string().email(),
  total_income: z.number().default(0),
  created_at: z.date(),
  updated_at: z.date(),
});

export const createDebtorSchema = debtorSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const updateDebtorSchema = createDebtorSchema.partial();

export const debtorResponseSchema = debtorSchema.extend({
  person: PersonSchema.optional().nullable(),
});

export type Debtor = z.infer<typeof debtorSchema>;
export type CreateDebtor = z.infer<typeof createDebtorSchema>;
export type UpdateDebtor = z.infer<typeof updateDebtorSchema>;
export type DebtorResponse = z.infer<typeof debtorResponseSchema>;
