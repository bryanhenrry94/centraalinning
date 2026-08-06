"use server";
import { DashboardService } from "@/modules/dashboard/services/dashboard.service";
import { ReportService } from "@/modules/dashboard/server/report.service";

export async function getDashboardStats() {
  try {
    const data = await DashboardService.getStats();
    return { success: true, data };
  } catch (error) {
    console.error("[v0] Fout bij het ophalen van statistieken:", error);
    return { success: false, error: "Fout bij het ophalen van statistieken" };
  }
}

export const getTableSummary = async (tenantId: string) => {
  return ReportService.getTableSummary(tenantId);
};

export const getOpenDocuments = async (tenantId: string) => {
  return ReportService.getOpenDocuments(tenantId);
};
