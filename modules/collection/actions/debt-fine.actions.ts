"use server";
import { DebtFineService } from "@/modules/collection/services/debt-fine.service";

export const applyCharge = async (
  debtClaimId: string,
  amount: number,
  concept: string,
  service: "FAR" | "AOP" | "BLK" | "BLC" | "COP" | "GOP",
) => {
  return DebtFineService.applyCharge(debtClaimId, amount, concept, service);
};

export const getChargesForClaim = async (debtClaimId: string) => {
  return DebtFineService.getChargesForClaim(debtClaimId);
};

export const getClaimChargeById = async (id: string) => {
  return DebtFineService.getById(id);
};

export const deleteClaimCharge = async (id: string) => {
  return DebtFineService.delete(id);
};

export const countChargesForClaim = async (debtClaimId: string) => {
  return DebtFineService.countForClaim(debtClaimId);
};
