"use server";
import { prisma } from "@/lib/prisma";

export const applyCharge = async (
  debtClaimId: string,
  amount: number,
  concept: string,
  service: "FAR" | "AOP" | "BLK" | "BLC" | "COL" | "GOP",
) => {
  return prisma.claimCharge.create({
    data: {
      debtClaimId,
      amount,
      concept,
      service,
      status: "PENDING",
    },
  });
};

export const getChargesForClaim = async (debtClaimId: string) => {
  return prisma.claimCharge.findMany({
    where: { debtClaimId },
    orderBy: { id: "desc" },
  });
};

export const getClaimChargeById = async (id: string) => {
  return prisma.claimCharge.findUnique({ where: { id } });
};

export const deleteClaimCharge = async (id: string) => {
  await prisma.claimCharge.delete({ where: { id } });
};

export const countChargesForClaim = async (debtClaimId: string) => {
  return prisma.claimCharge.count({ where: { debtClaimId } });
};
