import { prisma } from "@/lib/prisma";

export class ObligationService {
  // Aplica un monto a UNA obligación puntual — lógica compartida entre
  // applyPayment (pago 1:1, obligation_id directo en Payment) y
  // applyAllocatedPayment (un pago cubre varias obligaciones a la vez, ver
  // PaymentAllocation).
  private static async applyAmountToObligation(obligationId: string, amount: number) {
    const obligation = await prisma.debtClaimObligation.findUniqueOrThrow({
      where: { id: obligationId },
    });

    const newPaidAmount = Number(obligation.paidAmount) + amount;
    const newBalanceAmount = Math.max(
      Number(obligation.originalAmount) - newPaidAmount,
      0,
    );
    const status =
      newPaidAmount >= Number(obligation.originalAmount)
        ? "PAID"
        : "PARTIALLY_PAID";

    return prisma.debtClaimObligation.update({
      where: { id: obligationId },
      data: {
        paidAmount: newPaidAmount,
        balanceAmount: newBalanceAmount,
        status,
      },
    });
  }

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
      throw new Error("Betaling niet gevonden");
    }

    if (payment.status !== "paid") {
      throw new Error("Betaling is niet betaald");
    }

    if (!payment.obligation) {
      throw new Error("Verplichting niet gevonden");
    }

    return this.applyAmountToObligation(payment.obligation.id, Number(payment.total_amount));
  }

  // Un solo pago que cubre VARIAS obligaciones a la vez (ver
  // PaymentAllocation) — p.ej. el deudor paga en un solo botón el total de
  // costos CFSB, que administrativamente son obligaciones separadas
  // (registro del AOP + recargos posteriores). Cada obligación se actualiza
  // por su propio monto asignado, no por el total del pago.
  static async applyAllocatedPayment(paymentId: string) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { allocations: true },
    });

    if (!payment) {
      throw new Error("Betaling niet gevonden");
    }
    if (payment.status !== "paid") {
      throw new Error("Betaling is niet betaald");
    }
    if (payment.allocations.length === 0) {
      throw new Error("Geen toewijzingen gevonden voor deze betaling");
    }

    for (const allocation of payment.allocations) {
      await this.applyAmountToObligation(allocation.obligation_id, Number(allocation.amount));
    }
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
        payer: "DEBTOR",
        description: "Hoofdsom",
        originalAmount: fallbackAmount,
        paidAmount: 0,
        balanceAmount: fallbackAmount,
        status: "PENDING",
      },
    });
  }
}
