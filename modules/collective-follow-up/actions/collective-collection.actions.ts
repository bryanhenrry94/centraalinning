"use server";

import { CollectiveCollectionService } from "@/modules/collective-follow-up/services/collective-collection.service";
import {
  requireTenantStaffForDebtClaim,
  requireTenantStaffForCollection,
  requireDebtorForCollection,
  requireTenantStaffForNegotiation,
} from "@/modules/collective-follow-up/services/collective-collection-guards";
import { canUseFeature } from "@/shared/utils/permission";
import { AppAction } from "@/shared/constants/AppAction";
import { CollectiveCollectionStatus } from "@/modules/collective-follow-up/constants/collective-collection-status";
import {
  StartCollectiveCollectionSchema,
  RequestPaymentAgreementSchema,
  DecideNegotiationSchema,
  CloseCollectiveCollectionSchema,
} from "@/modules/collective-follow-up/services/collective-collection.validators";
import { TransferToLawyerSchema, TransferToLawyerInput } from "@/modules/legal-process/services/case-transfer.validators";

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

export const getCollectiveCollectionNegotiations = async (collectionId: string) => {
  return CollectiveCollectionService.getNegotiationsForCollection(collectionId);
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

export const requestCopPaymentAgreement = async (input: {
  collectionId: string;
  proposalAmount: number;
  notes?: string | null;
}) => {
  const parsed = RequestPaymentAgreementSchema.parse(input);
  const { session } = await requireDebtorForCollection(parsed.collectionId);

  return CollectiveCollectionService.requestPaymentAgreement(
    parsed.collectionId,
    { proposalAmount: parsed.proposalAmount, notes: parsed.notes },
    session.user.id,
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
