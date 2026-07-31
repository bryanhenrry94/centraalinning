"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { LegalProcessService } from "@/modules/legal-process/services/legal-process.service";
import {
  requireTenantStaffForDebtClaim,
  requireTenantStaffForLegalProcess,
  requireAssignedLawyerOrBailiff,
  requireStaffOrAssignedBailiff,
  requireStaffOrAssignedBailiffForVerdict,
} from "@/modules/legal-process/services/legal-process-guards";
import { canUseFeature } from "@/shared/utils/permission";
import { AppAction } from "@/shared/constants/AppAction";
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

export const getMyLegalProcessesAsBailiff = async () => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("U bent niet ingelogd.");
  return LegalProcessService.getForBailiffUser(session.user.id);
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

  return LegalProcessService.transferToLawyer(parsed, session.user.id);
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
  const { session, legalProcess } = await requireStaffOrAssignedBailiff(parsed.legalProcessId);
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
