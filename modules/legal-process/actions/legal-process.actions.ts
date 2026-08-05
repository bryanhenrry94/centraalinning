"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { LegalProcessService } from "@/modules/legal-process/services/legal-process.service";
import {
  requireTenantStaffForLegalProcess,
  requireAssignedBailiff,
  requireStaffOrAssignedBailiff,
  requireStaffOrAssignedBailiffForVerdict,
  requireStaffOrAssignedBailiffForDocuments,
} from "@/modules/legal-process/services/legal-process-guards";
import { requireAssignedBailiffForTransfer } from "@/modules/legal-process/services/case-transfer-guards";
import { toDocumentRow } from "@/modules/legal-process/utils/legal-process-document";
import { AgreementService } from "@/modules/agreement/services/agreement.service";
import { AgreementStatus } from "@/modules/agreement/constants/agreement-status";
import {
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
  SubmitBailiffFeeInvoiceInput,
  SubmitBailiffFeeInvoiceSchema,
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

// El PRIMER vonnis se registra desde una CaseTransfer (crea el LegalProcess
// en el momento); una sentencia ADICIONAL se registra sobre un LegalProcess
// ya existente. El guard correcto depende de cuál de los dos venga.
export const registerGopVerdict = async (data: RegisterVerdictInput) => {
  const parsed = RegisterVerdictSchema.parse(data);

  if (parsed.caseTransferId) {
    const { session, caseTransfer } = await requireAssignedBailiffForTransfer(parsed.caseTransferId);
    return LegalProcessService.registerVerdict(parsed, caseTransfer.debtClaim.tenantId, session.user.id);
  }

  const { session, legalProcess } = await requireAssignedBailiff(parsed.legalProcessId!);
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

// Solo el participante decide transferir el expediente a otro alguacil.
export const changeGopBailiff = async (data: ChangeBailiffInput) => {
  const parsed = ChangeBailiffSchema.parse(data);
  const { session } = await requireTenantStaffForLegalProcess(parsed.legalProcessId);
  return LegalProcessService.changeBailiff(parsed, session.user.id);
};

// El alguacil registra los costos facturados al debiteur y paga la comisión
// CFSB (5%) sobre ese monto — habilita el cierre del GOP.
export const submitBailiffFeeInvoice = async (data: SubmitBailiffFeeInvoiceInput, file: File) => {
  const parsed = SubmitBailiffFeeInvoiceSchema.parse(data);
  const { session } = await requireStaffOrAssignedBailiff(parsed.legalProcessId);
  const buffer = Buffer.from(await file.arrayBuffer());

  return LegalProcessService.submitBailiffFeeInvoice(
    {
      ...parsed,
      fileName: file.name,
      mimeType: file.type,
      size: file.size,
      buffer,
    },
    session.user.id,
  );
};

// El alguacil registra el cumplimiento total de la sentencia.
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
  const { session, legalProcess } = await requireStaffOrAssignedBailiffForDocuments(legalProcessId);
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

  await requireStaffOrAssignedBailiffForDocuments(document.legalProcessId);
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
