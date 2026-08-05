"use server";

import { FinancialAgreementService } from "@/modules/financial-agreement/services/financial-agreement.service";
import {
  requireTenantStaffForTenant,
  requireTenantStaffForFinancialAgreement,
} from "@/modules/financial-agreement/services/financial-agreement-guards";
import {
  CreateFinancialAgreementInput,
  CreateFinancialAgreementSchema,
} from "@/modules/financial-agreement/services/financial-agreement.validators";

export const createFinancialAgreement = async (
  tenantId: string,
  input: CreateFinancialAgreementInput,
) => {
  const parsed = CreateFinancialAgreementSchema.parse(input);
  const session = await requireTenantStaffForTenant(tenantId);
  return FinancialAgreementService.create(tenantId, parsed, session.user.id);
};

export const getFinancialAgreementById = async (id: string) => {
  await requireTenantStaffForFinancialAgreement(id);
  return FinancialAgreementService.getById(id);
};

export const getAllFinancialAgreementsForTenant = async (tenantId: string) => {
  await requireTenantStaffForTenant(tenantId);
  return FinancialAgreementService.getAllForTenant(tenantId);
};
