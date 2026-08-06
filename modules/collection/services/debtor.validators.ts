import { z } from "zod";
import { UserSchema } from "@/modules/auth/services/user.validators";
import {
  PersonCreateSchema,
  PersonSummarySchema,
} from "@/modules/collection/services/person.validators";

// DEBTOR INCOME
export const DebtorIncomeSchema = z.object({
  id: z.string().uuid(),
  debtor_id: z.string(),
  amount: z.number(),
  source: z.string(),
});

export const DebtorIncomeCreateSchema = DebtorIncomeSchema.omit({
  id: true,
});

// DEBTOR
export const DebtorSchema = z.object({
  id: z.string(),
  tenant_id: z.string(),
  person_id: z.string(),
  user_id: z.string().nullable(),
  email: z.email({ message: "Het e-mailadres is niet geldig." }),
  total_income: z.number(),
});

export const DebtorCreateSchema = DebtorSchema.omit({
  id: true,
  tenant_id: true,
  user_id: true,
}).extend({
  incomes: z.array(DebtorIncomeCreateSchema).optional(),
  person: PersonCreateSchema,
});

export const DebtorResponseSchema = DebtorSchema.extend({
  user: UserSchema.optional(),
  person: PersonSummarySchema.optional(),
});

export const DebtorSummarySchema = DebtorSchema.pick({
  id: true,
  email: true,
  total_income: true,
}).extend({
  fullname: z.string().optional(),
});

export type DebtorResponse = z.infer<typeof DebtorResponseSchema>;
