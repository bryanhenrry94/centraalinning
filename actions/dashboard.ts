"use server";

import prisma from "@/lib/prisma";

export async function getDashboardStats() {
  try {
    const [totalVerdicts, totalDebtors, totalCollection, facturasRecientes] =
      await Promise.all([
        // prisma.cliente.count({ where: { tenant_id } }),
        // prisma.producto.count({ where: { tenant_id } }),
        // prisma.factura.count({ where: { tenant_id } }),
        prisma.verdict.count(),
        prisma.debtor.count(),
        prisma.collectionCase.count(),
        prisma.billingInvoice.findMany({
          // where: { tenant_id: process.env.ADMIN_TENANT_ID },
          include: {
            tenant: true,
          },
          // orderBy: { created_at: "desc" },
          take: 5,
        }),
      ]);

    // Calcular ingresos del mes actual
    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);

    const facturasDelMes = await prisma.billingInvoice.findMany({
      where: {
        // tenant_id: process.env.ADMIN_TENANT_ID,
        created_at: {
          gte: inicioMes,
        },
      },
      include: {
        tenant: true,
      },
    });

    const incomeMonth = facturasDelMes.reduce(
      (total, factura) => total + factura.amount,
      0
    );

    return {
      success: true,
      data: {
        totalVerdicts,
        totalDebtors,
        totalCollection,
        incomeMonth,
        facturasRecientes,
      },
    };
  } catch (error) {
    console.error("[v0] Error al obtener estadísticas:", error);
    return { success: false, error: "Error al obtener estadísticas" };
  }
}
