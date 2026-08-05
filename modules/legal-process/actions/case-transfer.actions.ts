"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { CaseTransferService } from "@/modules/legal-process/services/case-transfer.service";
import {
  requireTenantStaffForDebtClaim,
  requireTenantStaffForCaseTransfer,
  requireAssignedLawyerOrBailiff,
  requireAssignedLawyer,
  requireStaffOrAssignedLawyerOrBailiffForTransfer,
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
