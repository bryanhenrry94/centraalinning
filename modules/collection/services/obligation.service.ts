import { prisma } from "@/lib/prisma";

class ObligationService {
  static async applyPayment(paymentId: string) {
    // Obtener pago
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

    // Actualizar monto pagado
    const totalPaid = payment.obligation.paidAmount;

    // Cambiar estado
    if (totalPaid >= payment.obligation.originalAmount) {
      await prisma.debtClaimObligation.update({
        where: {
          id: payment.obligation.id,
        },
        data: {
          paidAmount: totalPaid,
          status: "PAID",
        },
      });
    } else {
      await prisma.debtClaimObligation.update({
        where: {
          id: payment.obligation.id,
        },
        data: {
          paidAmount: totalPaid,
          status: "PARTIALLY_PAID",
        },
      });
    }
  }
}
