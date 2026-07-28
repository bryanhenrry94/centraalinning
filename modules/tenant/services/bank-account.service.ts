import { prisma } from "@/lib/prisma";
import {
  BankAccount,
  CreateBankAccount,
  UpdateBankAccount,
} from "@/modules/tenant/services/bank-account.validators";

export class BankAccountService {
  static async getAllByTenantId(
    tenant_id: string,
  ): Promise<{ success: boolean; error?: string; data?: BankAccount[] }> {
    try {
      const data = await prisma.bankAccount.findMany({ where: { tenant_id } });
      return { success: true, data: data as BankAccount[] };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Error desconocido" };
    }
  }

  static async getById(id: string): Promise<{ success: boolean; error?: string; data?: BankAccount | null }> {
    try {
      const data = await prisma.bankAccount.findUnique({ where: { id } });
      return { success: true, data: data as BankAccount | null };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Error desconocido" };
    }
  }

  static async create(data: CreateBankAccount, tenant_id: string): Promise<{ success: boolean; error?: string; data?: any }> {
    try {
      const bankAccount = await prisma.bankAccount.create({ data: { ...data, tenant_id } });
      return { success: true, data: bankAccount };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Error desconocido" };
    }
  }

  static async update(id: string, data: UpdateBankAccount): Promise<{ success: boolean; error?: string; data?: any }> {
    try {
      const bankAccount = await prisma.bankAccount.update({ where: { id }, data });
      return { success: true, data: bankAccount };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Error desconocido" };
    }
  }

  static async delete(id: string): Promise<{ success: boolean; error?: string; data?: any }> {
    try {
      const bankAccount = await prisma.bankAccount.delete({ where: { id } });
      return { success: true, data: bankAccount };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Error desconocido" };
    }
  }
}
