import { prisma } from "@/lib/prisma";

export class DebtFineService {
  static async applyCharge(
    debtClaimId: string,
    amount: number,
    concept: string,
    service: "FAR" | "AOP" | "BLK" | "BLC" | "COP" | "GOP",
  ) {
    return prisma.claimCharge.create({
      data: { debtClaimId, amount, concept, service, status: "PENDING" },
    });
  }

  static async getChargesForClaim(debtClaimId: string) {
    return prisma.claimCharge.findMany({
      where: { debtClaimId },
      orderBy: { id: "desc" },
    });
  }

  static async getById(id: string) {
    return prisma.claimCharge.findUnique({ where: { id } });
  }

  static async delete(id: string) {
    return prisma.claimCharge.delete({ where: { id } });
  }

  static async countForClaim(debtClaimId: string) {
    return prisma.claimCharge.count({ where: { debtClaimId } });
  }
}
