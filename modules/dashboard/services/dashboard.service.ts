import { prisma } from "@/lib/prisma";

export class DashboardService {
  static async getStats() {
    const [totalVerdicts, totalDebtors, totalCollection, facturasRecientes] =
      await Promise.all([
        prisma.verdict.count(),
        prisma.debtor.count(),
        prisma.debtClaim.count(),
        prisma.billingInvoice.findMany({
          include: { tenant: true },
          take: 5,
        }),
      ]);

    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);

    const facturasDelMes = await prisma.billingInvoice.findMany({
      where: { created_at: { gte: inicioMes } },
      include: { tenant: true },
    });

    const incomeMonth = facturasDelMes.reduce(
      (total: number, factura: any) => total + factura.amount,
      0,
    );

    return { totalVerdicts, totalDebtors, totalCollection, incomeMonth, facturasRecientes };
  }
}
