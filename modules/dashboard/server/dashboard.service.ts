import { ReportService } from "@/modules/dashboard/server/report.service";
import { DashboardResponse } from "../types/dashboard.types";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function getDashboard(): Promise<DashboardResponse> {
  // return serverClient.dashboard.summary();

  const session = await getServerSession(authOptions);
  const tenantId = session?.user.tenant_id;

  if (!tenantId) {
    throw new Error("Tenant ID is required to fetch dashboard data.");
  }

  const data = await ReportService.getTableSummary(tenantId);

  return {
    stats: {
      total: 5,
      active: 15000,
      completed: 10,
      blocked: 2,
    },
    status: [
      {
        name: "In afwachting",
        value: 12,
      },
      {
        name: "In behandeling",
        value: 24,
      },
      {
        name: "Voltooid",
        value: 32,
      },
      {
        name: "Geblokkeerd",
        value: 16,
      },
    ],
    modules: [
      { name: "BLC - Blok-Check", value: 32 },
      { name: "FAR - Financiele afspraken registreren", value: 24 },
      { name: "AOP - Administrative opvolging", value: 28 },
      { name: "BLK - Blokade", value: 16 },
      { name: "COL - Collectieve inning", value: 13 },
      { name: "GOP - Gerenchtelijke opvolging", value: 12 },
    ],
    documents: data,
  };
}
