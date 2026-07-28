import { z } from "zod";

export const bankAccountTypeEnum = z.enum(["SAVINGS", "CHECKING"]);

// Base bank account schema with all fields
export const bankAccountSchema = z.object({
  id: z.string().uuid(),
  bank_name: z.string().min(1, "El nombre del banco es obligatorio"),
  account_number: z.string().min(1, "El número de cuenta es obligatorio"),
  account_type: bankAccountTypeEnum,
  tenant_id: z.string().uuid(),
  created_at: z.date(),
  updated_at: z.date(),
});

// Schema for creating a new bank account (without id, tenant_id, created_at, updated_at)
export const createBankAccountSchema = bankAccountSchema.omit({
  id: true,
  tenant_id: true,
  created_at: true,
  updated_at: true,
});

// Schema for updating a bank account (all fields optional except id)
export const updateBankAccountSchema = bankAccountSchema
  .omit({
    id: true,
    tenant_id: true,
    created_at: true,
    updated_at: true,
  })
  .partial();

// Type exports
export type BankAccountType = z.infer<typeof bankAccountTypeEnum>;
export type BankAccount = z.infer<typeof bankAccountSchema>;
export type CreateBankAccount = z.infer<typeof createBankAccountSchema>;
export type UpdateBankAccount = z.infer<typeof updateBankAccountSchema>;
