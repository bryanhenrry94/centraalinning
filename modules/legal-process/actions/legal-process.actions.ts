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
  requireAuthorizedToDecideGopAgreement,
  requireAuthorizedToConfirmGopPayment,
  requireAuthorizedToCorrectGopPayment,
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

export const getGopExecutionMeasures = async (legalProcessId: string) => {
  await requireStaffOrAssignedBailiff(legalProcessId);
  return LegalProcessService.getExecutionMeasures(legalProcessId);
};

// Requisito para poder cerrar el GOP: toda actuación oficial debe quedar
// explícitamente marcada como concluida.
export const completeGopExecutionMeasure = async (legalProcessId: string, embargoId: string) => {
  const { session } = await requireStaffOrAssignedBailiff(legalProcessId);
  return LegalProcessService.completeExecutionMeasure(embargoId, session.user.id);
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

// El alguacil (o el participante) registra una PROPUESTA de acuerdo de
// pago; queda PENDING hasta que el participante decide (acepta, modifica o
// rechaza) — salvo que exista power of attorney otorgado, ver
// decideGopAgreement.
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
  const { session, legalProcess } = await requireStaffOrAssignedBailiff(legalProcessId);

  return AgreementService.create(
    legalProcess.debtClaim.tenantId,
    {
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
    },
    undefined,
    session.user.id,
  );
};

export const getGopAgreements = async (legalProcessId: string) => {
  return AgreementService.getAllByLegalProcessId(legalProcessId);
};

// El participante siempre puede decidir (aceptar, modificar o rechazar);
// el alguacil asignado solo si el CaseTransfer de origen tiene power of
// attorney otorgado (ver requireAuthorizedToDecideGopAgreement).
export const decideGopAgreement = async (
  legalProcessId: string,
  agreementId: string,
  decision: {
    status: "ACCEPTED" | "REJECTED";
    rejection_reason?: string;
    total_amount?: number;
    installment_amount?: number;
    installments_count?: number;
    start_date?: Date;
    end_date?: Date;
    comment?: string;
  },
) => {
  const { session, isTenantStaff, isAssignedProfessional, hasPowerOfAttorney } =
    await requireAuthorizedToDecideGopAgreement(legalProcessId);

  return AgreementService.decide(agreementId, decision, {
    userId: session.user.id,
    isTenantStaff,
    isAssignedProfessional,
    hasPowerOfAttorney,
  });
};

export const getGopPrincipalObligation = async (debtClaimId: string) => {
  return LegalProcessService.getPrincipalObligation(debtClaimId);
};

// Quien recibió el pago (alguacil o participante) lo registra + sube el
// comprobante. No se aplica al saldo hasta que la otra parte confirme.
export const registerGopPayment = async (
  legalProcessId: string,
  data: { amount: number; receivedBy: "BAILIFF" | "PARTICIPANT" },
  file: File,
) => {
  const { session } = await requireStaffOrAssignedBailiff(legalProcessId);
  const buffer = Buffer.from(await file.arrayBuffer());

  return LegalProcessService.registerGopPayment(
    legalProcessId,
    {
      amount: data.amount,
      receivedBy: data.receivedBy,
      fileName: file.name,
      mimeType: file.type,
      size: file.size,
      buffer,
    },
    session.user.id,
  );
};

export const getGopPaymentConfirmations = async (legalProcessId: string) => {
  return LegalProcessService.getPaymentConfirmations(legalProcessId);
};

// La contraparte de quien recibió el pago lo confirma — recién ahí se
// aplica al saldo del expediente.
export const confirmGopPayment = async (confirmationId: string) => {
  const { session } = await requireAuthorizedToConfirmGopPayment(confirmationId);
  return LegalProcessService.confirmGopPayment(confirmationId, session.user.id);
};

export const disputeGopPayment = async (confirmationId: string, reason: string) => {
  const { session } = await requireAuthorizedToConfirmGopPayment(confirmationId);
  return LegalProcessService.disputeGopPayment(confirmationId, reason, session.user.id);
};

// Solo quien registró originalmente el pago puede corregirlo tras una
// disputa; opcionalmente sube un comprobante nuevo.
export const correctGopPayment = async (
  confirmationId: string,
  data: { amount?: number; note?: string },
  file?: File,
) => {
  const { session } = await requireAuthorizedToCorrectGopPayment(confirmationId);
  const fileData = file
    ? {
        fileName: file.name,
        mimeType: file.type,
        size: file.size,
        buffer: Buffer.from(await file.arrayBuffer()),
      }
    : {};

  return LegalProcessService.correctGopPayment(
    confirmationId,
    { amount: data.amount, note: data.note, ...fileData },
    session.user.id,
  );
};
