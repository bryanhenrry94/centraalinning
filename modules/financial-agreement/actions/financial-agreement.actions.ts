"use server";

import { FinancialAgreementService } from "@/modules/financial-agreement/services/financial-agreement.service";
import {
  requireTenantStaffForTenant,
  requireTenantStaffForFinancialAgreement,
} from "@/modules/financial-agreement/services/financial-agreement-guards";
import {
  CreateFinancialAgreementWithDebtorInput,
  CreateFinancialAgreementWithDebtorSchema,
} from "@/modules/financial-agreement/services/financial-agreement.validators";

// Submit del wizard de alta (4 pasos): crea/reusa el Debtor, registra el FAR
// y sube los documentos adjuntados en el paso "Documenten", todo en un solo
// clic ("Registreren en betalen"). Los archivos se mantienen en memoria en
// el cliente hasta este punto — recién acá se persisten, porque hasta que
// no existe el FinancialAgreement no hay a qué entidad adjuntarlos.
export const createFinancialAgreementWithDebtor = async (
  tenantId: string,
  input: CreateFinancialAgreementWithDebtorInput,
  files: File[],
) => {
  const parsed = CreateFinancialAgreementWithDebtorSchema.parse(input);
  const session = await requireTenantStaffForTenant(tenantId);

  const fileInputs = await Promise.all(
    files.map(async (file) => ({
      fileName: file.name,
      mimeType: file.type,
      size: file.size,
      buffer: Buffer.from(await file.arrayBuffer()),
    })),
  );

  return FinancialAgreementService.createWithDebtor(
    tenantId,
    parsed,
    fileInputs,
    session.user.id,
  );
};

export const getFinancialAgreementById = async (id: string) => {
  await requireTenantStaffForFinancialAgreement(id);
  return FinancialAgreementService.getById(id);
};

export const getAllFinancialAgreementsForTenant = async (tenantId: string) => {
  await requireTenantStaffForTenant(tenantId);
  return FinancialAgreementService.getAllForTenant(tenantId);
};

export const getFinancialAgreementDocuments = async (financialAgreementId: string) => {
  await requireTenantStaffForFinancialAgreement(financialAgreementId);
  return FinancialAgreementService.getDocuments(financialAgreementId);
};

// "Vervolgen": inicia manualmente un expediente AOP nuevo a partir de un FAR
// registrado (ver FinancialAgreementService.initiateFollowUp). Crea el
// DebtClaim + verplichting en OPEN; el AOP recién se activa cuando se
// confirma el pago de esa verplichting (PaymentType.COLLECTION).
export const initiateFollowUpFromFinancialAgreement = async (financialAgreementId: string) => {
  await requireTenantStaffForFinancialAgreement(financialAgreementId);
  return FinancialAgreementService.initiateFollowUp(financialAgreementId);
};
