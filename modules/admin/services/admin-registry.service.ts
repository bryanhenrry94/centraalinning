import { prisma } from "@/lib/prisma";

// Consultas de solo lectura, cross-tenant, exclusivas para las pantallas de
// CFSB Admin. No reemplazan ni tocan los servicios tenant-scoped existentes
// (LegalProcessService.getAllForTenant, CollectiveCollectionService.
// getAllForTenant, etc.) — son el equivalente "sin filtro de tenant" que
// esos servicios deliberadamente no exponen.

function personName(person: {
  first_name?: string | null;
  last_name?: string | null;
  business_name?: string | null;
} | null | undefined): string {
  if (!person) return "-";
  const full = `${person.first_name ?? ""} ${person.last_name ?? ""}`.trim();
  return full || person.business_name || "-";
}

// Mismos "abiertos" que report.service.ts (dashboard del deelnemer) — se
// reutiliza el criterio, no se redefine.
const OPEN_DEBT_CLAIM_STATUSES = ["OPEN", "IN_PROGRESS"] as const;

export class AdminRegistryService {
  // ---------------------------------------------------------------------
  // Admin Dashboard — cifras cross-tenant (feedback sponsor: el dashboard
  // que ve PLATFORM_OWNER debe reflejar el sistema completo, no un tenant
  // en particular).
  // ---------------------------------------------------------------------

  static getDashboardStats = async () => {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [
      totalTenants,
      activeTenants,
      totalDebtors,
      openDossiers,
      totalLawyers,
      totalBailiffs,
      activeBlockades,
      pendingTransfers,
      monthPayments,
    ] = await Promise.all([
      prisma.tenant.count(),
      prisma.tenant.count({ where: { is_active: true } }),
      prisma.debtor.count(),
      prisma.debtClaim.count({ where: { status: { in: [...OPEN_DEBT_CLAIM_STATUSES] } } }),
      prisma.lawyer.count({ where: { deletedAt: null } }),
      prisma.bailiff.count(),
      prisma.blockade.count({ where: { status: "ACTIVE" } }),
      prisma.caseTransfer.count({ where: { status: "PENDING_ACCEPTANCE" } }),
      prisma.payment.aggregate({
        where: { status: "paid", paid_at: { gte: startOfMonth } },
        _sum: { total_amount: true },
      }),
    ]);

    return {
      totalTenants,
      activeTenants,
      totalDebtors,
      openDossiers,
      totalLawyers,
      totalBailiffs,
      activeBlockades,
      pendingTransfers,
      monthRevenue: Number(monthPayments._sum.total_amount ?? 0),
    };
  };

  // ---------------------------------------------------------------------
  // Dossiers & registers
  // ---------------------------------------------------------------------

  static getAllDebtClaims = async () => {
    const items = await prisma.debtClaim.findMany({
      include: {
        tenant: { select: { id: true, name: true } },
        debtor: { include: { person: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return items.map((c) => ({
      id: c.id,
      reference: c.reference,
      tenantId: c.tenantId,
      tenantName: c.tenant.name,
      debtorName: personName(c.debtor.person),
      principalAmount: Number(c.principalAmount),
      origin: c.origin,
      status: c.status,
      createdAt: c.createdAt,
    }));
  };

  static getDebtClaimById = async (id: string) => {
    const c = await prisma.debtClaim.findUnique({
      where: { id },
      include: {
        tenant: { select: { id: true, name: true } },
        debtor: { include: { person: true } },
      },
    });
    if (!c) return null;
    return {
      id: c.id,
      reference: c.reference,
      externalReference: c.externalReference,
      description: c.description,
      tenantId: c.tenantId,
      tenantName: c.tenant.name,
      debtorName: personName(c.debtor.person),
      debtorEmail: c.debtor.email,
      principalAmount: Number(c.principalAmount),
      currency: c.currency,
      origin: c.origin,
      status: c.status,
      createdAt: c.createdAt,
      closedAt: c.closedAt,
    };
  };

  static getAllFinancialAgreements = async () => {
    const items = await prisma.financialAgreement.findMany({
      include: { tenant: { select: { name: true } }, debtor: { include: { person: true } } },
      orderBy: { createdAt: "desc" },
    });
    return items.map((a) => ({
      id: a.id,
      reference: a.reference,
      tenantName: a.tenant.name,
      debtorName: personName(a.debtor.person),
      amount: Number(a.amount),
      status: a.status,
      createdAt: a.createdAt,
    }));
  };

  static getAllBlockChecks = async () => {
    const items = await prisma.blockCheck.findMany({
      include: { tenant: { select: { name: true } }, person: true },
      orderBy: { checkedAt: "desc" },
    });
    return items.map((b) => ({
      id: b.id,
      tenantName: b.tenant.name,
      personName: personName(b.person),
      blockadeFound: b.blockadeFound,
      price: Number(b.price),
      checkedAt: b.checkedAt,
    }));
  };

  static getAllAdministrativeCollections = async () => {
    const items = await prisma.administrativeCollection.findMany({
      include: {
        debtClaim: { include: { tenant: { select: { name: true } }, debtor: { include: { person: true } } } },
      },
      orderBy: { startedAt: "desc" },
    });
    return items.map((a) => ({
      id: a.id,
      debtClaimId: a.debtClaimId,
      reference: a.debtClaim.reference,
      tenantName: a.debtClaim.tenant.name,
      debtorName: personName(a.debtClaim.debtor.person),
      status: a.status,
      startedAt: a.startedAt,
      finishedAt: a.finishedAt,
    }));
  };

  static getAllBlockades = async () => {
    const items = await prisma.blockade.findMany({
      include: { tenant: { select: { name: true } }, debtor: { include: { person: true } } },
      orderBy: { registeredAt: "desc" },
    });
    return items.map((b) => ({
      id: b.id,
      tenantName: b.tenant.name,
      debtorName: personName(b.debtor.person),
      reason: b.reason,
      status: b.status,
      registeredAt: b.registeredAt,
      releasedAt: b.releasedAt,
    }));
  };

  static getAllCollectiveCollections = async () => {
    const items = await prisma.collectiveCollection.findMany({
      include: {
        debtClaim: { include: { tenant: { select: { name: true } }, debtor: { include: { person: true } } } },
        employerTenant: { select: { name: true } },
      },
      orderBy: { startedAt: "desc" },
    });
    return items.map((c) => ({
      id: c.id,
      debtClaimId: c.debtClaimId,
      reference: c.debtClaim.reference,
      tenantName: c.debtClaim.tenant.name,
      debtorName: personName(c.debtClaim.debtor.person),
      employerTenantName: c.employerTenant?.name ?? null,
      status: c.status,
      startedAt: c.startedAt,
      finishedAt: c.finishedAt,
    }));
  };

  static getAllLegalProcesses = async () => {
    const items = await prisma.legalProcess.findMany({
      include: {
        debtClaim: { include: { tenant: { select: { name: true } }, debtor: { include: { person: true } } } },
        bailiff: { select: { fullname: true } },
      },
      orderBy: { startedAt: "desc" },
    });
    return items.map((g) => ({
      id: g.id,
      debtClaimId: g.debtClaimId,
      referenceNumber: g.referenceNumber,
      reference: g.debtClaim.reference,
      tenantName: g.debtClaim.tenant.name,
      debtorName: personName(g.debtClaim.debtor.person),
      bailiffName: g.bailiff?.fullname ?? "-",
      status: g.status,
      startedAt: g.startedAt,
      closedAt: g.closedAt,
    }));
  };

  static getAllCaseTransfers = async () => {
    const items = await prisma.caseTransfer.findMany({
      include: {
        debtClaim: { include: { tenant: { select: { name: true } }, debtor: { include: { person: true } } } },
        lawyer: { select: { firstName: true, lastName: true } },
        bailiff: { select: { fullname: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return items.map((t) => ({
      id: t.id,
      debtClaimId: t.debtClaimId,
      reference: t.debtClaim.reference,
      tenantName: t.debtClaim.tenant.name,
      debtorName: personName(t.debtClaim.debtor.person),
      assigneeName: t.lawyer
        ? `${t.lawyer.firstName} ${t.lawyer.lastName}`
        : (t.bailiff?.fullname ?? "-"),
      status: t.status,
      createdAt: t.createdAt,
    }));
  };

  // ---------------------------------------------------------------------
  // Financieel
  // ---------------------------------------------------------------------

  static getAllPayments = async () => {
    const items = await prisma.payment.findMany({
      include: { tenant: { select: { name: true } } },
      orderBy: { created_at: "desc" },
      take: 500,
    });
    return items.map((p) => ({
      id: p.id,
      tenantName: p.tenant.name,
      totalAmount: Number(p.total_amount),
      status: p.status,
      paymentType: p.payment_type,
      method: p.method,
      createdAt: p.created_at,
      paidAt: p.paid_at,
    }));
  };

  static getAllObligations = async () => {
    const items = await prisma.debtClaimObligation.findMany({
      include: {
        debtClaim: { include: { tenant: { select: { name: true } }, debtor: { include: { person: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    });
    return items.map((o) => ({
      id: o.id,
      debtClaimId: o.debtClaimId,
      reference: o.debtClaim.reference,
      tenantName: o.debtClaim.tenant.name,
      debtorName: personName(o.debtClaim.debtor.person),
      type: o.type,
      beneficiary: o.beneficiary,
      description: o.description,
      originalAmount: Number(o.originalAmount),
      balanceAmount: Number(o.balanceAmount),
      status: o.status,
    }));
  };

  // Administratieve overtredingen/vergoedingen: kosten die CFSB in rekening
  // bracht op een dossier (ClaimCharge) — incluye las penalidades por no
  // reactie (aanmaning/sommatie) y demás cargos del sistema.
  static getAllClaimCharges = async () => {
    const items = await prisma.claimCharge.findMany({
      include: {
        debtClaim: { include: { tenant: { select: { name: true } }, debtor: { include: { person: true } } } },
      },
      orderBy: { id: "desc" },
      take: 500,
    });
    return items.map((c) => ({
      id: c.id,
      debtClaimId: c.debtClaimId,
      reference: c.debtClaim.reference,
      tenantName: c.debtClaim.tenant.name,
      debtorName: personName(c.debtClaim.debtor.person),
      service: c.service,
      concept: c.concept,
      amount: Number(c.amount),
      status: c.status,
    }));
  };

  // ---------------------------------------------------------------------
  // Beheer & controle
  // ---------------------------------------------------------------------

  static getAllUsersWithRoles = async () => {
    const users = await prisma.user.findMany({
      include: {
        memberships: {
          include: {
            tenant: { select: { id: true, name: true } },
            roles: true,
          },
        },
      },
      orderBy: { created_at: "desc" },
      take: 500,
    });
    return users.map((u) => ({
      id: u.id,
      email: u.email,
      fullname: u.fullname,
      isActive: u.is_active,
      createdAt: u.created_at,
      memberships: u.memberships.map((m) => ({
        tenantId: m.tenant.id,
        tenantName: m.tenant.name,
        status: m.status,
        roles: m.roles.map((r) => r.role),
      })),
    }));
  };

  static getAllEmployerConfirmations = async () => {
    const items = await prisma.cOLNetworkQuery.findMany({
      include: {
        collection: {
          include: { debtClaim: { include: { tenant: { select: { name: true } } } } },
        },
        responses: { include: { tenant: { select: { name: true } } } },
      },
      orderBy: { broadcastAt: "desc" },
      take: 500,
    });
    return items.map((q) => ({
      id: q.id,
      requestingTenantName: q.collection.debtClaim.tenant.name,
      debtClaimReference: q.collection.debtClaim.reference,
      displayName: q.displayName,
      status: q.status,
      broadcastAt: q.broadcastAt,
      responseDeadline: q.responseDeadline,
      responses: q.responses.map((r) => ({
        tenantName: r.tenant.name,
        answer: r.answer,
        respondedAt: r.respondedAt,
      })),
    }));
  };
}
