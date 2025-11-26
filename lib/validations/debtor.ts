import { z } from "zod";
import { DebtorIncomeCreateSchema } from "./debtor-incomes";
import { UserSchema } from "@/lib/validations/user";
import { personCreateSchema, personSummarySchema } from "./person";

// Esquema base para Debtor con validaciones en español
export const DebtorBaseSchema = z.object({
  id: z.string(),
  tenant_id: z.string(),
  user_id: z.string().nullable(),
  person_id: z.string(),
  email: z.string().email({ message: "El correo electrónico no es válido." }),
  total_income: z.number(),
  incomes: z.array(DebtorIncomeCreateSchema).optional(),
  created_at: z.date().optional(),
  updated_at: z.date().optional(),
});

// Esquema para crear un Debtor (CRUD), omitiendo campos automáticos y relacionales
export const DebtorCreateSchema = DebtorBaseSchema.omit({
  id: true,
  tenant_id: true,
  user_id: true,
  created_at: true,
  updated_at: true,
}).extend({
  person: personCreateSchema,
});

export const DebtorResponseSchema = DebtorBaseSchema.extend({
  user: UserSchema.optional(),
  person: personSummarySchema.optional(),
});

export const DebtorSchema = DebtorBaseSchema.omit({
  tenant_id: true,
  user_id: true,
  total_income: true,
  incomes: true,
  created_at: true,
  updated_at: true,
});

export const DebtorSummarySchema = DebtorBaseSchema.pick({
  id: true,
  email: true,
  total_income: true,
}).extend({
  fullname: z.string().optional(),
});

export type DebtorSummary = z.infer<typeof DebtorSummarySchema>;

export type DebtorBase = z.infer<typeof DebtorBaseSchema>;
export type DebtorCreate = z.infer<typeof DebtorCreateSchema>;
export type DebtorResponse = z.infer<typeof DebtorResponseSchema>;
