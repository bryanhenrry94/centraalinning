"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { UserRole } from "@/shared/constants/user-role";
import { SettingsService } from "@/modules/settings/services/settings/settings.service";
import { CollectiveCollectionService } from "@/modules/collective-follow-up/services/collective-collection.service";
import {
  requireTenantStaffForDebtClaim,
  requireTenantStaffForCollection,
  requireDebtorOrEmployerForNegotiation,
  requireTenantStaffForNegotiation,
  requireTenantStaffForNetworkQuery,
} from "@/modules/collective-follow-up/services/collective-collection-guards";
import { canUseFeature } from "@/shared/utils/permission";
import { AppAction } from "@/shared/constants/AppAction";
import { CollectiveCollectionStatus } from "@/modules/collective-follow-up/constants/collective-collection-status";
import {
  StartCollectiveCollectionSchema,
  RequestPaymentAgreementSchema,
  DecideNegotiationSchema,
  CloseCollectiveCollectionSchema,
  SetAutoContinueSchema,
  SubmitNetworkResponseSchema,
} from "@/modules/collective-follow-up/services/collective-collection.validators";
import { TransferToLawyerSchema, TransferToLawyerInput } from "@/modules/legal-process/services/case-transfer.validators";

const COL_AUTO_CONTINUE_SETTING_KEY = "col_auto_continue_from_aop";
const COL_AUTO_CONTINUE_CATEGORY_ID = "cat-cop";

async function requireTenantAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.tenant_id) {
    throw new Error("U bent niet ingelogd.");
  }
  if (!session.user.roles?.includes(UserRole.TENANT_ADMIN)) {
    throw new Error("Alleen een organisatiebeheerder kan deze instelling wijzigen.");
  }
  return session;
}

export const getAutoContinueSetting = async (tenantId: string) => {
  return SettingsService.resolveBoolean(COL_AUTO_CONTINUE_SETTING_KEY, { tenantId }, false);
};

export const setAutoContinueSetting = async (input: { enabled: boolean }) => {
  const parsed = SetAutoContinueSchema.parse(input);
  const session = await requireTenantAdmin();

  await SettingsService.upsertTenantBooleanSetting(
    session.user.tenant_id!,
    COL_AUTO_CONTINUE_CATEGORY_ID,
    COL_AUTO_CONTINUE_SETTING_KEY,
    "Automatisch doorgaan van AOP naar COP",
    parsed.enabled,
  );

  return { enabled: parsed.enabled };
};

export const getCollectiveCollectionById = async (id: string) => {
  return CollectiveCollectionService.getById(id);
};

export const getCollectiveCollectionByDebtClaimId = async (debtClaimId: string) => {
  return CollectiveCollectionService.getByDebtClaimId(debtClaimId);
};

export const getAllCollectiveCollectionsForTenant = async (
  tenantId: string,
  status?: CollectiveCollectionStatus,
) => {
  return CollectiveCollectionService.getAllForTenant(tenantId, status ? { status } : undefined);
};

export const getCollectiveCollectionsForDebtor = async (debtorId: string) => {
  return CollectiveCollectionService.getForDebtor(debtorId);
};

// Para el staff del tenant confirmado como empleador — expedientes de OTROS
// tenants donde puede actuar en nombre del deudor (ver
// requireDebtorOrEmployerForNegotiation).
export const getCollectiveCollectionsForEmployerTenant = async (tenantId: string) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.tenant_id !== tenantId) {
    throw new Error("U bent niet ingelogd of niet bevoegd.");
  }
  return CollectiveCollectionService.getForEmployerTenant(tenantId);
};

export const getCollectiveCollectionNegotiations = async (collectionId: string) => {
  return CollectiveCollectionService.getNegotiationsForCollection(collectionId);
};

export const getCollectiveCollectionNotifications = async (collectionId: string) => {
  await requireTenantStaffForCollection(collectionId);
  return CollectiveCollectionService.getNotificationsForCollection(collectionId);
};

export const getCollectiveCollectionNetworkQuery = async (collectionId: string) => {
  await requireTenantStaffForCollection(collectionId);
  return CollectiveCollectionService.getNetworkQueryForCollection(collectionId);
};

// Inbox de preguntas de red pendientes para el staff del tenant logueado
// (no requiere collectionId — el tenant no conoce el expediente, solo la
// pregunta que le llegó).
export const getPendingNetworkQueriesForTenant = async (tenantId: string) => {
  return CollectiveCollectionService.getPendingNetworkQueriesForTenant(tenantId);
};

export const submitNetworkQueryResponse = async (input: {
  queryId: string;
  answer: "YES" | "NO";
}) => {
  const parsed = SubmitNetworkResponseSchema.parse(input);
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.tenant_id) {
    throw new Error("U bent niet ingelogd.");
  }
  const { session: verifiedSession } = await requireTenantStaffForNetworkQuery(
    parsed.queryId,
    session.user.tenant_id,
  );

  return CollectiveCollectionService.submitNetworkResponse(
    parsed.queryId,
    session.user.tenant_id,
    parsed.answer,
    verifiedSession.user.id,
  );
};

export const checkCanStartCop = async (debtClaimId: string) => {
  return CollectiveCollectionService.canStart(debtClaimId);
};

export const requestStartCollectiveCollection = async (input: { debtClaimId: string }) => {
  const parsed = StartCollectiveCollectionSchema.parse(input);
  const { session } = await requireTenantStaffForDebtClaim(parsed.debtClaimId);

  const membership = session.user.memberships?.find(
    (m) => m.tenantId === session.user.tenant_id,
  );
  const permission = canUseFeature(membership ?? null, AppAction.START_COP);
  if (!permission.allowed) {
    throw new Error(permission.reason ?? "Deze actie is niet toegestaan.");
  }

  return CollectiveCollectionService.requestStart(parsed.debtClaimId, session.user.id);
};

export const resumeCollectiveCollectionStartPayment = async (collectionId: string) => {
  await requireTenantStaffForCollection(collectionId);
  return CollectiveCollectionService.resumeStartPayment(collectionId);
};

export const requestCopPaymentAgreement = async (input: {
  collectionId: string;
  installmentsCount: number;
  startDate: Date;
  notes?: string | null;
}) => {
  const parsed = RequestPaymentAgreementSchema.parse(input);
  const { session, collection, submittedByRole } = await requireDebtorOrEmployerForNegotiation(
    parsed.collectionId,
  );

  return CollectiveCollectionService.requestPaymentAgreement(
    parsed.collectionId,
    { installmentsCount: parsed.installmentsCount, startDate: parsed.startDate, notes: parsed.notes },
    session.user.id,
    {
      submittedByRole,
      onBehalfOfEmployerTenantId: submittedByRole === "EMPLOYER" ? collection.employerTenantId : null,
    },
  );
};

export const decideCopNegotiation = async (input: {
  negotiationId: string;
  action: "ACCEPT" | "ACCEPT_MODIFIED" | "REJECT";
  acceptedAmount?: number | null;
  notes?: string | null;
}) => {
  const parsed = DecideNegotiationSchema.parse(input);
  const { session } = await requireTenantStaffForNegotiation(parsed.negotiationId);

  return CollectiveCollectionService.decideNegotiation(
    parsed.negotiationId,
    {
      action: parsed.action,
      acceptedAmount: parsed.acceptedAmount,
      notes: parsed.notes,
    },
    session.user.id,
  );
};

export const keepCopActive = async (collectionId: string) => {
  const { session } = await requireTenantStaffForCollection(collectionId);
  return CollectiveCollectionService.keepActive(collectionId, session.user.id);
};

export const transferCopToGop = async (
  collectionId: string,
  transferInput: TransferToLawyerInput,
) => {
  const parsedTransfer = TransferToLawyerSchema.parse(transferInput);
  const { session } = await requireTenantStaffForCollection(collectionId);

  const membership = session.user.memberships?.find(
    (m) => m.tenantId === session.user.tenant_id,
  );
  const permission = canUseFeature(membership ?? null, AppAction.TRANSFER_TO_LAWYER);
  if (!permission.allowed) {
    throw new Error(permission.reason ?? "Deze actie is niet toegestaan.");
  }

  return CollectiveCollectionService.transferToGop(collectionId, parsedTransfer, session.user.id);
};

export const closeCollectiveCollection = async (input: { collectionId: string; reason: string }) => {
  const parsed = CloseCollectiveCollectionSchema.parse(input);
  const { session } = await requireTenantStaffForCollection(parsed.collectionId);

  return CollectiveCollectionService.close(parsed.collectionId, parsed.reason, session.user.id);
};
