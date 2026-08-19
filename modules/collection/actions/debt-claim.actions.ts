"use server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  DebtClaim,
  DebtClaimCreate,
  DebtClaimView,
} from "@/modules/collection/services/collection.validators";
import { DebtClaimFilter } from "@/modules/collection/services/collection.type";
import { CollectionService } from "@/modules/collection/services/collection.service";
import { ClaimTimelineService } from "@/modules/collection/services/claim-timeline.service";

export const getDebtClaimById = async (id: string): Promise<DebtClaim> => {
  return CollectionService.getById(id);
};

export const getDebtClaimViewById = async (
  id: string,
): Promise<DebtClaimView> => {
  return CollectionService.getViewById(id);
};

export const updateDebtClaim = async (id: string, data: Partial<DebtClaim>) => {
  return CollectionService.update(id, data);
};

export const advanceAOPStep = async (debtClaimId: string) => {
  return CollectionService.advanceAOPStep(debtClaimId);
};

export const applyAopNoResponseFee = async (
  debtClaimId: string,
  step: "REMINDER" | "FINAL_NOTICE",
  amount: number,
) => {
  return CollectionService.applyNoResponseFee(debtClaimId, step, amount);
};

export const hasPrincipalPayment = async (debtClaimId: string): Promise<boolean> => {
  return CollectionService.hasPrincipalPayment(debtClaimId);
};

export async function getDebtClaimsAction(params: DebtClaimFilter) {
  return CollectionService.getAll(params);
}

export async function createDebtClaimAction(data: DebtClaimCreate) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenant_id) throw new Error("Unauthorized");

  return CollectionService.create(data, session.user.tenant_id);
}

export async function createPendingDebtClaimAction(data: DebtClaimCreate) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenant_id) throw new Error("Unauthorized");

  return CollectionService.createPending(data, session.user.tenant_id);
}

export const getClaimTimelineForDebtClaim = async (debtClaimId: string) => {
  return ClaimTimelineService.getForDebtClaim(debtClaimId);
};
