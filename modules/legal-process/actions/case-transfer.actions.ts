"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { CaseTransferService } from "@/modules/legal-process/services/case-transfer.service";
import { AgreementService } from "@/modules/agreement/services/agreement.service";
import { AgreementStatus } from "@/modules/agreement/constants/agreement-status";
import {
  requireTenantStaffForDebtClaim,
  requireTenantStaffForCaseTransfer,
  requireAssignedLawyerOrBailiff,
  requireAssignedLawyer,
  requireStaffOrAssignedLawyerOrBailiffForTransfer,
  requireStaffOrAssignedLawyerOrBailiffForAgreementProposal,
  requireAuthorizedToDecideCaseTransferAgreement,
} from "@/modules/legal-process/services/case-transfer-guards";
import { canUseFeature } from "@/shared/utils/permission";
import { AppAction } from "@/shared/constants/AppAction";
import { toCaseTransferDocumentRow } from "@/modules/legal-process/utils/case-transfer-document";
import {
  TransferToLawyerInput,
  TransferToLawyerSchema,
  RejectTransferInput,
  RejectTransferSchema,
  CancelCaseTransferInput,
  CancelCaseTransferSchema,
  SubmitLawyerFeeInvoiceInput,
  SubmitLawyerFeeInvoiceSchema,
  AssignBailiffForExecutionInput,
  AssignBailiffForExecutionSchema,
} from "@/modules/legal-process/services/case-transfer.validators";

type ProposeAgreementInput = {
  total_amount: number;
  installment_amount: number;
  installments_count: number;
  start_date: Date;
  end_date: Date;
  comment?: string;
};

type DecideAgreementInput = {
  status: "ACCEPTED" | "REJECTED";
  rejection_reason?: string;
  total_amount?: number;
  installment_amount?: number;
  installments_count?: number;
  start_date?: Date;
  end_date?: Date;
  comment?: string;
};

export const getCaseTransferById = async (id: string) => {
  return CaseTransferService.getById(id);
};

export const getAllCaseTransfersForTenant = async (tenantId: string) => {
  return CaseTransferService.getAllForTenant(tenantId);
};

export const getMyCaseTransfersAsLawyer = async () => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("U bent niet ingelogd.");
  return CaseTransferService.getForLawyerUser(session.user.id);
};

export const getMyCaseTransfersAsBailiff = async () => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("U bent niet ingelogd.");
  return CaseTransferService.getForBailiffUser(session.user.id);
};

export const getMyCaseTransferDocuments = async () => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("U bent niet ingelogd.");
  const items = await CaseTransferService.getForLawyerUser(session.user.id);
  return items.map(toCaseTransferDocumentRow);
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

  return CaseTransferService.requestTransfer(parsed, session.user.id);
};

export const acceptCaseTransfer = async (caseTransferId: string) => {
  const { session } = await requireAssignedLawyerOrBailiff(caseTransferId);
  return CaseTransferService.acceptTransfer(caseTransferId, session.user.id);
};

export const rejectCaseTransfer = async (input: RejectTransferInput) => {
  const parsed = RejectTransferSchema.parse(input);
  const { session } = await requireAssignedLawyerOrBailiff(parsed.caseTransferId);
  return CaseTransferService.rejectTransfer(parsed.caseTransferId, parsed.reason, session.user.id);
};

// Solo el participante puede cancelar el GOP antes del vonnis.
export const cancelCaseTransfer = async (input: CancelCaseTransferInput) => {
  const parsed = CancelCaseTransferSchema.parse(input);
  const { session } = await requireTenantStaffForCaseTransfer(parsed.caseTransferId);
  return CaseTransferService.cancelTransfer(parsed.caseTransferId, parsed.reason, session.user.id);
};

// El participante concede 7 días más al mismo abogado/alguacil (decisión
// del día 7, ver CaseTransferService.sendAcceptanceReminders).
export const extendCaseTransferAcceptanceDeadline = async (caseTransferId: string) => {
  const { session } = await requireTenantStaffForCaseTransfer(caseTransferId);
  return CaseTransferService.extendAcceptanceDeadline(caseTransferId, session.user.id);
};

// El participante decide no esperar más y elegir otro profesional — solo
// disponible una vez vencido el plazo de aceptación (nunca automático).
// El participante vuelve luego al expediente (DebtClaim) para transferir a
// otro abogado/alguacil vía transferToLawyer.
export const rejectOverdueCaseTransfer = async (caseTransferId: string) => {
  const { session, caseTransfer } = await requireTenantStaffForCaseTransfer(caseTransferId);
  if (caseTransfer.status !== "PENDING_ACCEPTANCE") {
    throw new Error("Dit dossier is niet in afwachting van acceptatie.");
  }
  if (!caseTransfer.acceptanceDeadline || caseTransfer.acceptanceDeadline > new Date()) {
    throw new Error("De acceptatietermijn is nog niet verstreken.");
  }

  const reason =
    "De deelnemer heeft besloten het dossier over te dragen aan een andere professional nadat de acceptatietermijn was verstreken.";
  return CaseTransferService.rejectTransfer(caseTransferId, reason, session.user.id);
};

export const submitLawyerFeeInvoice = async (data: SubmitLawyerFeeInvoiceInput, file: File) => {
  const parsed = SubmitLawyerFeeInvoiceSchema.parse(data);
  const { session } = await requireAssignedLawyer(parsed.caseTransferId);
  const buffer = Buffer.from(await file.arrayBuffer());

  return CaseTransferService.submitLawyerFeeInvoice(
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

export const assignBailiffForExecution = async (data: AssignBailiffForExecutionInput) => {
  const parsed = AssignBailiffForExecutionSchema.parse(data);
  const { session } = await requireAssignedLawyer(parsed.caseTransferId);
  return CaseTransferService.assignBailiffForExecution(parsed, session.user.id);
};

export const uploadCaseTransferDocument = async (
  caseTransferId: string,
  file: File,
  category?: string,
) => {
  const { session, caseTransfer } = await requireStaffOrAssignedLawyerOrBailiffForTransfer(caseTransferId);
  const buffer = Buffer.from(await file.arrayBuffer());

  return CaseTransferService.uploadDocument({
    caseTransferId,
    tenantId: caseTransfer.debtClaim.tenantId,
    uploadedById: session.user.id,
    fileName: file.name,
    mimeType: file.type,
    size: file.size,
    buffer,
    category,
  });
};

export const getCaseTransferDocuments = async (caseTransferId: string) => {
  return CaseTransferService.getDocuments(caseTransferId);
};

export const deleteCaseTransferDocument = async (documentId: string) => {
  const document = await CaseTransferService.getDocumentById(documentId);
  if (!document) throw new Error("Document niet gevonden");

  await requireStaffOrAssignedLawyerOrBailiffForTransfer(document.caseTransferId);
  return CaseTransferService.deleteDocument(documentId);
};

// ---------------------------------------------------------------------
// Power of attorney y acuerdos de pago pre-vonnis (regla definitiva:
// el abogado/alguacil propone, el participante decide, salvo volmacht).
// ---------------------------------------------------------------------

export const setCaseTransferPowerOfAttorney = async (
  caseTransferId: string,
  granted: boolean,
  note?: string,
) => {
  const { session } = await requireTenantStaffForCaseTransfer(caseTransferId);
  return CaseTransferService.setPowerOfAttorney(caseTransferId, granted, note, session.user.id);
};

export const proposeCaseTransferAgreement = async (
  caseTransferId: string,
  data: ProposeAgreementInput,
) => {
  const { session, caseTransfer } =
    await requireStaffOrAssignedLawyerOrBailiffForAgreementProposal(caseTransferId);

  return AgreementService.create(
    caseTransfer.debtClaim.tenantId,
    {
      debtClaim_id: caseTransfer.debtClaimId,
      caseTransferId,
      debtor_id: caseTransfer.debtClaim.debtorId,
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

export const getCaseTransferAgreements = async (caseTransferId: string) => {
  return AgreementService.getAllByCaseTransferId(caseTransferId);
};

export const decideCaseTransferAgreement = async (
  caseTransferId: string,
  agreementId: string,
  decision: DecideAgreementInput,
) => {
  const { session, caseTransfer, isTenantStaff, isAssignedProfessional } =
    await requireAuthorizedToDecideCaseTransferAgreement(caseTransferId);

  return AgreementService.decide(agreementId, decision, {
    userId: session.user.id,
    isTenantStaff,
    isAssignedProfessional,
    hasPowerOfAttorney: caseTransfer.hasPowerOfAttorney,
  });
};
