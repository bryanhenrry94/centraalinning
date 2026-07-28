import { prisma } from "@/lib/prisma";

export class ObligationService {
  static async applyPayment(paymentId: string) {
    const payment = await prisma.payment.findUnique({
      where: {
        id: paymentId,
      },
      include: {
        obligation: true,
      },
    });

    if (!payment) {
      throw new Error("Payment not found");
    }

    if (payment.status !== "paid") {
      throw new Error("Payment is not paid");
    }

    if (!payment.obligation) {
      throw new Error("Obligation not found");
    }

    const newPaidAmount =
      Number(payment.obligation.paidAmount) + Number(payment.total_amount);
    const newBalanceAmount = Math.max(
      Number(payment.obligation.originalAmount) - newPaidAmount,
      0,
    );
    const status =
      newPaidAmount >= Number(payment.obligation.originalAmount)
        ? "PAID"
        : "PARTIALLY_PAID";

    await prisma.debtClaimObligation.update({
      where: {
        id: payment.obligation.id,
      },
      data: {
        paidAmount: newPaidAmount,
        balanceAmount: newBalanceAmount,
        status,
      },
    });
  }

  static async ensurePrincipalDebtObligation(
    debtClaimId: string,
    fallbackAmount: number,
  ) {
    const existing = await prisma.debtClaimObligation.findFirst({
      where: {
        debtClaimId,
        type: "PRINCIPAL_DEBT",
        beneficiary: "PARTICIPANT",
        status: { in: ["PENDING", "PARTIALLY_PAID"] },
      },
    });

    if (existing) {
      return existing;
    }

    return prisma.debtClaimObligation.create({
      data: {
        debtClaimId,
        type: "PRINCIPAL_DEBT",
        beneficiary: "PARTICIPANT",
        originalAmount: fallbackAmount,
        paidAmount: 0,
        balanceAmount: fallbackAmount,
        status: "PENDING",
      },
    });
  }
}
