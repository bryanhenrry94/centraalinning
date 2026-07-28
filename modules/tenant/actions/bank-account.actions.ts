"use server";
import {
  BankAccount,
  CreateBankAccount,
  UpdateBankAccount,
} from "@/modules/tenant/services/bank-account.validators";
import { BankAccountService } from "@/modules/tenant/services/bank-account.service";

export async function getAllBankAccountsByTenantId(
  tenant_id: string,
): Promise<{ success: boolean; error?: string; data?: BankAccount[] }> {
  return BankAccountService.getAllByTenantId(tenant_id);
}

export async function getBankAccountById(
  id: string,
): Promise<{ success: boolean; error?: string; data?: BankAccount | null }> {
  return BankAccountService.getById(id);
}

export async function createBankAccount(
  data: CreateBankAccount,
  tenant_id: string,
): Promise<{ success: boolean; error?: string; data?: any }> {
  return BankAccountService.create(data, tenant_id);
}

export async function updateBankAccount(
  id: string,
  data: UpdateBankAccount,
): Promise<{ success: boolean; error?: string; data?: any }> {
  return BankAccountService.update(id, data);
}

export async function deleteBankAccount(
  id: string,
): Promise<{ success: boolean; error?: string; data?: any }> {
  return BankAccountService.delete(id);
}
