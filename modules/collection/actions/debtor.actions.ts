"use server";
import { DebtorInput, DebtorCreate, DebtorResponse } from "@/modules/collection/services/debtor.type";
import { DebtorSummary } from "@/modules/collection/types/DebtorSummary";
import { DebtorService } from "@/modules/collection/services/debtor.service";

export async function getDebtorsAction(tenantId: string) {
  return DebtorService.getAll(tenantId);
}

export const getAllDebtorsByTenantId = async (
  tenant_id: string,
): Promise<DebtorResponse[]> => {
  try {
    return DebtorService.getAllByTenantId(tenant_id);
  } catch {
    throw new Error("Error fetching debtors");
  }
};

export const getAllDebtors = async (): Promise<DebtorInput[]> => {
  try {
    return DebtorService.getAllDebtors();
  } catch {
    throw new Error("Error fetching debtors");
  }
};

export const getDebtorById = async (id: string): Promise<DebtorInput | null> => {
  try {
    return DebtorService.getById(id);
  } catch {
    throw new Error("Error fetching debtor");
  }
};

export const getDebtorByUserId = async (
  user_id: string,
  tenant_id: string,
): Promise<DebtorInput | null> => {
  try {
    return DebtorService.getByUserId(user_id, tenant_id);
  } catch {
    throw new Error("Error fetching debtor by user ID");
  }
};

export const getDebtorPersonalNumber = async (
  user_id: string,
  tenant_id: string,
): Promise<string | null> => {
  return DebtorService.getPersonalNumberByUserId(user_id, tenant_id);
};

export const createDebtor = async (
  debtor: DebtorCreate,
  tenant_id: string,
): Promise<{ success: boolean; error?: string; data?: DebtorInput }> => {
  return DebtorService.create(debtor, tenant_id);
};

export const updateDebtor = async (
  debtor: DebtorCreate,
  tenant_id: string,
  id: string,
): Promise<{ success: boolean; error?: string; data?: DebtorInput }> => {
  return DebtorService.update(debtor, tenant_id, id);
};

export const getDebtorInfo = async (
  tenant_id: string,
  identification: string,
): Promise<DebtorInput> => {
  return DebtorService.getInfo(tenant_id, identification);
};

export const createDebtorIfNotExists = async (
  _tenant_id: string,
  _debtor: DebtorCreate,
): Promise<DebtorCreate | null> => {
  return null;
};

export const validaEmailDebtorUserExist = async (
  email: string,
  tenant_id: string,
  debtor_id: string,
): Promise<boolean> => {
  return DebtorService.emailDebtorUserExists(email, tenant_id, debtor_id);
};

export const sendFinancialSummaryEmail = async (_debtor_id: string): Promise<boolean> => {
  return false;
};

interface DebtFilters {
  tenant_id?: string;
  debtor_id?: string;
  person_id?: string;
}

export const getDebts = async (
  filters: DebtFilters,
): Promise<{ success: boolean; data?: DebtorSummary[]; message?: string }> => {
  return DebtorService.getDebts(filters);
};
