"use server";
import { DashboardService } from "@/modules/dashboard/services/dashboard.service";
import { ReportService } from "@/modules/dashboard/server/report.service";

export async function getDashboardStats() {
  try {
    const data = await DashboardService.getStats();
    return { success: true, data };
  } catch (error) {
    console.error("[v0] Error al obtener estadísticas:", error);
    return { success: false, error: "Error al obtener estadísticas" };
  }
}

export const getTableSummary = async (tenantId: string) => {
  return ReportService.getTableSummary(tenantId);
};
