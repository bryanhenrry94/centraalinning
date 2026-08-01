"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { LegalProcessService } from "@/modules/legal-process/services/legal-process.service";
import {
  requireTenantStaffForDebtClaim,
  requireTenantStaffForLegalProcess,
  requireAssignedLawyerOrBailiff,
  requireAssignedBailiff,
  requireStaffOrAssignedBailiff,
  requireStaffOrAssignedBailiffForVerdict,
} from "@/modules/legal-process/services/legal-process-guards";
import { canUseFeature } from "@/shared/utils/permission";
import { AppAction } from "@/shared/constants/AppAction";
import { toDocumentRow } from "@/modules/legal-process/utils/legal-process-document";
import { AgreementService } from "@/modules/agreement/services/agreement.service";
import { AgreementStatus } from "@/modules/agreement/constants/agreement-status";
import {
  TransferToLawyerInput,
  TransferToLawyerSchema,
  RegisterVerdictInput,
  RegisterVerdictSchema,
  RegisterExecutionMeasureInput,
  RegisterExecutionMeasureSchema,
  RegisterInterestUpdateInput,
  RegisterInterestUpdateSchema,
  RegisterBailiffCostInput,
  RegisterBailiffCostSchema,
  MarkInactiveInput,
  MarkInactiveSchema,
  ChangeBailiffInput,
  ChangeBailiffSchema,
  CancelLegalProcessInput,
  CancelLegalProcessSchema,
} from "@/modules/legal-process/services/legal-process.validators";

export const getLegalProcessById = async (id: string) => {
  return LegalProcessService.getById(id);
};

export const getLegalProcessByDebtClaimId = async (debtClaimId: string) => {
  return LegalProcessService.getByDebtClaimId(debtClaimId);
};

export const getAllLegalProcessesForTenant = async (tenantId: string) => {
  return LegalProcessService.getAllForTenant(tenantId);
};

// El userId se toma de la sesión, no de un parámetro del cliente: de lo
// contrario cualquiera podría consultar los expedientes de otro abogado o alguacil.
export const getMyLegalProcessesAsLawyer = async () => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("U bent niet ingelogd.");
  return LegalProcessService.getForLawyerUser(session.user.id);
};

export const getMyLegalProcessDocuments = async () => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("U bent niet ingelogd.");
  const items = await LegalProcessService.getForLawyerUser(session.user.id);
  return items.map(toDocumentRow);
};

export const getMyLegalProcessesAsBailiff = async () => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("U bent niet ingelogd.");
  return LegalProcessService.getForBailiffUser(session.user.id);
};

export const getMyLegalProcessDocumentsAsBailiff = async () => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("U bent niet ingelogd.");
  const items = await LegalProcessService.getForBailiffUser(session.user.id);
  return items.map(toDocumentRow);
};

export const transferToLawyer = async (input: TransferToLawyerInput) => {
  const parsed = TransferToLawyerSchema.parse(input);
  const { session } = await requireTenantStaffForDebtClaim(parsed.debtClaimId);

  const membership = session.user.memberships?.find(
    (m) => m.tenantId === session.user.tenant_id,
  );
  const permission = canUseFeature(membership ?? null, AppAction.TRANSFER_TO_LAWYER);
  if (!permission.allowed) {
    throw new Error(permission.reason ?? "Deze actie is niet toegestaan.");
  }

  return LegalProcessService.requestTransfer(parsed, session.user.id);
};

export const acceptLegalProcessTransfer = async (legalProcessId: string) => {
  const { session } = await requireAssignedLawyerOrBailiff(legalProcessId);
  return LegalProcessService.acceptTransfer(legalProcessId, session.user.id);
};

export const rejectLegalProcessTransfer = async (legalProcessId: string, reason: string) => {
  const { session } = await requireAssignedLawyerOrBailiff(legalProcessId);
  return LegalProcessService.rejectTransfer(legalProcessId, reason, session.user.id);
};

export const registerGopVerdict = async (data: RegisterVerdictInput) => {
  const parsed = RegisterVerdictSchema.parse(data);
  const { session, legalProcess } = await requireAssignedBailiff(parsed.legalProcessId);
  return LegalProcessService.registerVerdict(parsed, legalProcess.debtClaim.tenantId, session.user.id);
};

export const registerGopExecutionMeasure = async (data: RegisterExecutionMeasureInput) => {
  const parsed = RegisterExecutionMeasureSchema.parse(data);
  const { session } = await requireStaffOrAssignedBailiffForVerdict(parsed.verdictId);
  return LegalProcessService.registerExecutionMeasure(parsed, session.user.id);
};

export const registerGopInterestUpdate = async (data: RegisterInterestUpdateInput) => {
  const parsed = RegisterInterestUpdateSchema.parse(data);
  const { session } = await requireStaffOrAssignedBailiffForVerdict(parsed.verdictId);
  return LegalProcessService.registerInterestUpdate(parsed, session.user.id);
};

export const registerGopBailiffCost = async (data: RegisterBailiffCostInput) => {
  const parsed = RegisterBailiffCostSchema.parse(data);
  const { session, legalProcess } = await requireStaffOrAssignedBailiffForVerdict(parsed.verdictId);
  return LegalProcessService.registerBailiffCost(
    parsed,
    legalProcess.debtClaim.tenantId,
    session.user.id,
  );
};

export const markGopInactive = async (data: MarkInactiveInput) => {
  const parsed = MarkInactiveSchema.parse(data);
  const { session } = await requireStaffOrAssignedBailiff(parsed.legalProcessId);
  return LegalProcessService.markInactive(parsed, session.user.id);
};

export const reactivateGop = async (legalProcessId: string) => {
  const { session } = await requireStaffOrAssignedBailiff(legalProcessId);
  return LegalProcessService.reactivate(legalProcessId, session.user.id);
};

// Sección 13: solo el participante decide transferir el expediente a otro alguacil.
export const changeGopBailiff = async (data: ChangeBailiffInput) => {
  const parsed = ChangeBailiffSchema.parse(data);
  const { session } = await requireTenantStaffForLegalProcess(parsed.legalProcessId);
  return LegalProcessService.changeBailiff(parsed, session.user.id);
};

// Sección 14: solo el participante puede cancelar el GOP.
export const cancelGop = async (data: CancelLegalProcessInput) => {
  const parsed = CancelLegalProcessSchema.parse(data);
  const { session } = await requireTenantStaffForLegalProcess(parsed.legalProcessId);
  return LegalProcessService.cancel(parsed, session.user.id);
};

// Sección 15: el alguacil registra el cumplimiento total de la sentencia.
export const closeGop = async (legalProcessId: string) => {
  const { session } = await requireStaffOrAssignedBailiff(legalProcessId);
  return LegalProcessService.close(legalProcessId, session.user.id);
};

export const checkAndCloseGopIfSettled = async (legalProcessId: string) => {
  const { session, legalProcess } = await requireStaffOrAssignedBailiff(legalProcessId);
  return LegalProcessService.checkAndCloseIfSettled(legalProcess.debtClaimId, session.user.id);
};

export const uploadLegalProcessDocument = async (
  legalProcessId: string,
  file: File,
  category?: string,
) => {
  const { session, legalProcess } = await requireStaffOrAssignedBailiff(legalProcessId);
  const buffer = Buffer.from(await file.arrayBuffer());

  return LegalProcessService.uploadDocument({
    legalProcessId,
    tenantId: legalProcess.debtClaim.tenantId,
    uploadedById: session.user.id,
    fileName: file.name,
    mimeType: file.type,
    size: file.size,
    buffer,
    category,
  });
};

export const getLegalProcessDocuments = async (legalProcessId: string) => {
  return LegalProcessService.getDocuments(legalProcessId);
};

export const deleteLegalProcessDocument = async (documentId: string) => {
  const document = await LegalProcessService.getDocumentById(documentId);
  if (!document) throw new Error("Document niet gevonden");

  await requireStaffOrAssignedBailiff(document.legalProcessId);
  return LegalProcessService.deleteDocument(documentId);
};

// El agente judicial registra el acuerdo de pago negociado con el deudor;
// queda PENDING hasta que el participante lo aprueba o rechaza (mismo flujo
// que AgreementService.update ya usa en /agreements).
export const createGopAgreement = async (
  legalProcessId: string,
  data: {
    total_amount: number;
    installment_amount: number;
    installments_count: number;
    start_date: Date;
    end_date: Date;
    comment?: string;
  },
) => {
  const { legalProcess } = await requireStaffOrAssignedBailiff(legalProcessId);

  return AgreementService.create(legalProcess.debtClaim.tenantId, {
    debtClaim_id: legalProcess.debtClaimId,
    legalProcessId,
    debtor_id: legalProcess.debtClaim.debtorId,
    total_amount: data.total_amount,
    installment_amount: data.installment_amount,
    installments_count: data.installments_count,
    start_date: data.start_date,
    end_date: data.end_date,
    comment: data.comment,
    status: AgreementStatus.PENDING,
  });
};

export const getGopAgreements = async (legalProcessId: string) => {
  return AgreementService.getAllByLegalProcessId(legalProcessId);
};

export const getGopPrincipalObligation = async (debtClaimId: string) => {
  return LegalProcessService.getPrincipalObligation(debtClaimId);
};

export const registerGopPayment = async (legalProcessId: string, amount: number) => {
  const { session } = await requireStaffOrAssignedBailiff(legalProcessId);
  return LegalProcessService.registerPayment(legalProcessId, amount, session.user.id);
};
