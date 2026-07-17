import { prisma } from "@/lib/prisma";
import {
  ReportService,
  DocumentFilter,
  OPEN_DEBT_CLAIM_STATUSES,
  COMPLETED_DEBT_CLAIM_STATUSES,
} from "@/modules/dashboard/server/report.service";
import { DashboardResponse } from "../types/dashboard.types";
import { TableSummaryResponse } from "../types/report.types";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function getDashboard(): Promise<DashboardResponse> {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user.tenant_id;

  if (!tenantId) {
    throw new Error("Tenant ID is required to fetch dashboard data.");
  }

  const [
    openDocuments,
    completedDocuments,
    outstandingAmount,
    activeBlockadesCount,
    openStatusCount,
    inProgressStatusCount,
    completedStatusCount,
    documents,
    blockCheckCount,
    contractCount,
    aopCount,
    blockadeCount,
    colCount,
    gopCount,
  ] = await Promise.all([
    ReportService.getOpenDocuments(tenantId),
    ReportService.getCompletedDocuments(tenantId),
    prisma.debtClaim.aggregate({
      where: { tenantId, status: { in: [...OPEN_DEBT_CLAIM_STATUSES] } },
      _sum: { principalAmount: true },
    }),
    prisma.blockade.count({ where: { tenantId, status: "ACTIVE" } }),
    prisma.debtClaim.count({ where: { tenantId, status: "OPEN" } }),
    prisma.debtClaim.count({ where: { tenantId, status: "IN_PROGRESS" } }),
    prisma.debtClaim.count({
      where: { tenantId, status: { in: [...COMPLETED_DEBT_CLAIM_STATUSES] } },
    }),
    ReportService.getTableSummary(tenantId),
    prisma.blockCheck.count({ where: { tenantId } }),
    prisma.contract.count({ where: { tenant_id: tenantId } }),
    prisma.administrativeCollection.count({
      where: { debtClaim: { tenantId } },
    }),
    prisma.blockade.count({ where: { tenantId } }),
    prisma.collectiveCollection.count({
      where: { debtClaim: { tenantId } },
    }),
    prisma.legalProcess.count({ where: { debtClaim: { tenantId } } }),
  ]);

  return {
    stats: {
      total: openDocuments.length,
      active: Number(outstandingAmount._sum.principalAmount ?? 0),
      completed: completedDocuments.length,
      blocked: activeBlockadesCount,
    },
    status: [
      { name: "In afwachting", value: openStatusCount },
      { name: "In behandeling", value: inProgressStatusCount },
      { name: "Voltooid", value: completedStatusCount },
      { name: "Geblokkeerd", value: activeBlockadesCount },
    ],
    modules: [
      { name: "BLC - Blok-Check", value: blockCheckCount },
      { name: "FAR - Financiele afspraken registreren", value: contractCount },
      { name: "AOP - Administrative opvolging", value: aopCount },
      { name: "BLK - Blokade", value: blockadeCount },
      { name: "COP - Collectieve opvolging", value: colCount },
      { name: "GOP - Gerenchtelijke opvolging", value: gopCount },
    ],
    documents,
  };
}

export async function getDocuments(
  filter: DocumentFilter = "open",
): Promise<TableSummaryResponse[]> {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user.tenant_id;

  if (!tenantId) {
    throw new Error("Tenant ID is required to fetch dashboard data.");
  }

  return ReportService.getDocuments(tenantId, { filter });
}
