import { prisma } from "@/lib/prisma";
import {
  ReportService,
  DocumentFilter,
  OPEN_DEBT_CLAIM_STATUSES,
  COMPLETED_DEBT_CLAIM_STATUSES,
} from "@/modules/dashboard/server/report.service";
import { DashboardResponse, PendingAction } from "../types/dashboard.types";
import { TableSummaryResponse } from "../types/report.types";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Agrega, en un solo listado accionable, las decisiones que realmente
// requieren al deelnemer — sin esto, tiene que abrir cada dossier por
// separado para descubrir dónde falta hacer algo (feedback sponsor, sectie
// 12 "Actie vereist"). Cada item ya trae su propio href directo a la
// pantalla de decisión (mismo patrón que el deep-link ?open=<id> de
// /agreements).
async function getPendingActions(tenantId: string): Promise<PendingAction[]> {
  const [pendingAgreements, openNegotiations] = await Promise.all([
    prisma.agreement.findMany({
      where: { tenant_id: tenantId, status: { in: ["PENDING", "COUNTEROFFER"] } },
      include: { debtClaim: { select: { reference: true } } },
      orderBy: { created_at: "desc" },
    }),
    prisma.cOLNegotiation.findMany({
      where: { status: "OPEN", collection: { debtClaim: { tenantId } } },
      include: { collection: { include: { debtClaim: { select: { reference: true } } } } },
    }),
  ]);

  const agreementActions: PendingAction[] = pendingAgreements.map((agreement) => ({
    id: agreement.id,
    module: agreement.legalProcessId || agreement.caseTransferId ? "GOP" : "AOP",
    reference: agreement.debtClaim.reference ?? agreement.debtClaim_id,
    label: "Betalingsregeling beoordelen",
    href: `/agreements?open=${agreement.id}`,
  }));

  const negotiationActions: PendingAction[] = openNegotiations.map((negotiation) => ({
    id: negotiation.id,
    module: "COP",
    reference: negotiation.collection.debtClaim.reference ?? negotiation.collection.debtClaimId,
    label:
      negotiation.submittedByRole === "EMPLOYER"
        ? "Tegenvoorstel werkgever beoordelen"
        : "Tegenvoorstel debiteur beoordelen",
    href: `/collective-follow-up/${negotiation.collectionId}`,
  }));

  return [...agreementActions, ...negotiationActions];
}

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
    pendingActions,
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
    getPendingActions(tenantId),
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
    pendingActions,
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
