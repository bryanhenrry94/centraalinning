import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { ClaimTimelineService } from "@/modules/collection/services/claim-timeline.service";
import { NotificationService } from "@/modules/notification/services/notification.service";
import { NotificationType } from "@/modules/notification/constants/notification-type";
import { BlockadeService } from "@/modules/blockade/services/blockade.service";
import { EmployeeService } from "@/modules/employee/services/employee.service";
import { CaseTransferService } from "@/modules/legal-process/services/case-transfer.service";
import { TransferToLawyerInput } from "@/modules/legal-process/services/case-transfer.validators";
import {
  CollectiveCollectionStatus,
  OPEN_COLLECTIVE_COLLECTION_STATUSES,
} from "@/modules/collective-follow-up/constants/collective-collection-status";

const collectiveCollectionInclude = {
  debtClaim: { include: { debtor: { include: { person: true } }, tenant: true } },
} satisfies Prisma.CollectiveCollectionInclude;

type CollectiveCollectionWithInclude = Prisma.CollectiveCollectionGetPayload<{
  include: typeof collectiveCollectionInclude;
}>;

// Decimal no cruza de un Server Action a un Client Component — mismo patrón
// que legal-process.service.ts / case-transfer.service.ts.
function serializeCollection<T extends CollectiveCollectionWithInclude>(collection: T) {
  return {
    ...collection,
    debtClaim: {
      ...collection.debtClaim,
      principalAmount: Number(collection.debtClaim.principalAmount),
    },
  };
}

export class CollectiveCollectionService {
  // ---------------------------------------------------------------------
  // Lecturas
  // ---------------------------------------------------------------------

  static getById = async (id: string) => {
    const collection = await prisma.collectiveCollection.findUnique({
      where: { id },
      include: collectiveCollectionInclude,
    });
    return collection ? serializeCollection(collection) : null;
  };

  static getByDebtClaimId = async (debtClaimId: string) => {
    const collection = await prisma.collectiveCollection.findUnique({
      where: { debtClaimId },
      include: collectiveCollectionInclude,
    });
    return collection ? serializeCollection(collection) : null;
  };

  static getAllForTenant = async (
    tenantId: string,
    filter?: { status?: CollectiveCollectionStatus },
  ) => {
    const items = await prisma.collectiveCollection.findMany({
      where: { debtClaim: { tenantId }, ...(filter?.status ? { status: filter.status } : {}) },
      include: collectiveCollectionInclude,
      orderBy: { startedAt: "desc" },
    });
    return items.map(serializeCollection);
  };

  static getForDebtor = async (debtorId: string) => {
    const items = await prisma.collectiveCollection.findMany({
      where: { debtClaim: { debtorId } },
      include: collectiveCollectionInclude,
      orderBy: { startedAt: "desc" },
    });
    return items.map(serializeCollection);
  };

  static getNegotiationsForCollection = async (collectionId: string) => {
    const negotiations = await prisma.cOLNegotiation.findMany({
      where: { collectionId },
      orderBy: { id: "desc" },
    });
    return negotiations.map((n) => ({
      ...n,
      proposalAmount: Number(n.proposalAmount),
      acceptedAmount: n.acceptedAmount != null ? Number(n.acceptedAmount) : null,
    }));
  };

  static canStart = async (
    debtClaimId: string,
  ): Promise<{ allowed: boolean; reason?: string }> => {
    const existing = await prisma.collectiveCollection.findUnique({ where: { debtClaimId } });
    if (existing) {
      return { allowed: false, reason: "Er bestaat al een collectieve opvolging voor dit dossier." };
    }

    const activeBlockade = await prisma.blockade.findFirst({
      where: { originDebtClaimId: debtClaimId, status: "ACTIVE" },
    });
    if (!activeBlockade) {
      return {
        allowed: false,
        reason: "Vereist een actieve economische blokkade om een collectieve opvolging te starten.",
      };
    }

    return { allowed: true };
  };

  // ---------------------------------------------------------------------
  // Ciclo de vida
  // ---------------------------------------------------------------------

  static start = async (debtClaimId: string, actorUserId: string) => {
    const canStartResult = await this.canStart(debtClaimId);
    if (!canStartResult.allowed) {
      throw new Error(canStartResult.reason ?? "Kan geen collectieve opvolging starten.");
    }

    const debtClaim = await prisma.debtClaim.findUnique({
      where: { id: debtClaimId },
      include: { tenant: true },
    });
    if (!debtClaim) throw new Error("Dossier niet gevonden.");

    const collection = await prisma.$transaction(async (tx) => {
      const created = await tx.collectiveCollection.create({
        data: { debtClaimId, status: CollectiveCollectionStatus.ACTIVE, startedAt: new Date() },
      });

      await tx.claimService.create({
        data: {
          debtClaimId,
          service: "COP",
          status: "IN_PROGRESS",
          startedAt: new Date(),
          startedById: actorUserId,
        },
      });

      await tx.claimTimeline.create({
        data: {
          debtClaimId,
          event: "COL_STARTED",
          description: `Collectieve Opvolging gestart voor dossier ${debtClaim.reference ?? debtClaimId}.`,
        },
      });

      return created;
    });

    // Best-effort: la creación del COP ya está confirmada, estos pasos no
    // deben poder revertirla si fallan.
    try {
      await NotificationService.notifyTenantStaff(
        debtClaim.tenantId,
        {
          type: NotificationType.COL_STARTED,
          title: "Collectieve Opvolging gestart",
          message: `Er is een collectieve opvolging gestart voor dossier ${debtClaim.reference ?? debtClaimId}.`,
          link: `/collective-follow-up/${collection.id}`,
          entity_type: "CollectiveCollection",
          entity_id: collection.id,
        },
        { excludeUserId: actorUserId },
      );
    } catch (error) {
      console.error("Error notifying tenant staff of COP start:", error);
    }

    try {
      await this.runEmployerCheck(collection.id);
    } catch (error) {
      console.error("Error running employer check for COP:", error);
    }

    try {
      await this.notifyDebtorStarted(collection.id);
    } catch (error) {
      console.error("Error notifying debtor of COP start:", error);
    }

    const updated = await prisma.collectiveCollection.update({
      where: { id: collection.id },
      data: { status: CollectiveCollectionStatus.AWAITING_DEBTOR_RESPONSE },
      include: collectiveCollectionInclude,
    });

    return serializeCollection(updated);
  };

  // Verifica si el deudor trabaja para un tenant afiliado (Paso 2/3 del
  // proceso COP). No-op si ya se encontró un empleador antes.
  static runEmployerCheck = async (collectionId: string) => {
    const collection = await prisma.collectiveCollection.findUnique({
      where: { id: collectionId },
      include: { debtClaim: { include: { debtor: { include: { person: true } } } } },
    });
    if (!collection || collection.employerTenantId) return { matched: false };

    const identification = collection.debtClaim.debtor.person?.identification;
    const match = identification
      ? await EmployeeService.findEmployerTenantForPerson(identification)
      : null;
    if (!match) return { matched: false };

    await prisma.collectiveCollection.update({
      where: { id: collectionId },
      data: { employerTenantId: match.tenantId, employerMatchedAt: new Date() },
    });

    await ClaimTimelineService.logEvent(
      collection.debtClaimId,
      "COL_EMPLOYER_FOUND",
      `Werkgever gevonden binnen het CFSB-netwerk voor dossier ${collection.debtClaim.reference ?? collection.debtClaimId}.`,
    );

    // No se comparte información financiera ni el contenido del expediente
    // con el empleador — solo la solicitud genérica de informar al deudor.
    await NotificationService.notifyTenantStaff(match.tenantId, {
      type: NotificationType.COL_EMPLOYER_MATCH_FOUND,
      title: "Verzoek: informeer uw medewerker",
      message:
        "Een van uw medewerkers heeft een openstaande verplichting binnen het CFSB-samenwerkingsnetwerk. Gelieve deze persoon hierover te informeren.",
      entity_type: "CollectiveCollection",
      entity_id: collectionId,
    });

    await prisma.cOLNotification.create({
      data: {
        collectionId,
        recipientType: "EMPLOYER",
        channel: "IN_APP",
        status: "SENT",
        sentAt: new Date(),
      },
    });

    return { matched: true, employerTenantId: match.tenantId };
  };

  // Llamado únicamente por el job periódico — vuelve a intentar el chequeo
  // de empleador para todos los COP abiertos que todavía no encontraron uno
  // (Paso 3: "cuando existan cambios futuros, CFSB volverá a verificar
  // automáticamente").
  static recheckAllPendingEmployerMatches = async () => {
    const pending = await prisma.collectiveCollection.findMany({
      where: { employerTenantId: null, status: { in: OPEN_COLLECTIVE_COLLECTION_STATUSES } },
      select: { id: true },
    });

    let matched = 0;
    for (const item of pending) {
      const result = await this.runEmployerCheck(item.id);
      if (result.matched) matched++;
    }

    return { checked: pending.length, matched };
  };

  static notifyDebtorStarted = async (collectionId: string) => {
    const collection = await prisma.collectiveCollection.findUnique({
      where: { id: collectionId },
      include: { debtClaim: { include: { debtor: true } } },
    });
    if (!collection) return;

    await ClaimTimelineService.logEvent(
      collection.debtClaimId,
      "COL_DEBTOR_NOTIFIED",
      `Debiteur geïnformeerd over de collectieve opvolging voor dossier ${collection.debtClaim.reference ?? collection.debtClaimId}.`,
    );

    if (collection.debtClaim.debtor.user_id) {
      await NotificationService.create({
        tenant_id: collection.debtClaim.tenantId,
        user_id: collection.debtClaim.debtor.user_id,
        type: NotificationType.COL_DEBTOR_NOTIFIED,
        title: "Collectieve Opvolging actief",
        message: `Er is een collectieve opvolging actief voor dossier ${collection.debtClaim.reference ?? collection.debtClaimId}. U kunt nog betalen of een betalingsregeling aanvragen om een gerechtelijke procedure te voorkomen.`,
        link: `/collective-follow-up/${collection.id}`,
        entity_type: "CollectiveCollection",
        entity_id: collection.id,
      });
    }

    await prisma.cOLNotification.create({
      data: {
        collectionId,
        recipientType: "DEBTOR",
        channel: "IN_APP",
        status: "SENT",
        sentAt: new Date(),
      },
    });
  };

  // ---------------------------------------------------------------------
  // Acuerdo de pago (COLNegotiation)
  // ---------------------------------------------------------------------

  static requestPaymentAgreement = async (
    collectionId: string,
    input: { proposalAmount: number; notes?: string | null },
    requestingUserId: string,
  ) => {
    const collection = await prisma.collectiveCollection.findUnique({
      where: { id: collectionId },
      include: { debtClaim: true },
    });
    if (!collection) throw new Error("Dossier niet gevonden.");

    if (
      collection.status !== CollectiveCollectionStatus.ACTIVE &&
      collection.status !== CollectiveCollectionStatus.AWAITING_DEBTOR_RESPONSE
    ) {
      throw new Error("Er kan in deze status geen betalingsregeling worden aangevraagd.");
    }

    const openNegotiation = await prisma.cOLNegotiation.findFirst({
      where: { collectionId, status: "OPEN" },
    });
    if (openNegotiation) {
      throw new Error("Er is al een betalingsregeling in behandeling voor dit dossier.");
    }

    const negotiation = await prisma.$transaction(async (tx) => {
      const created = await tx.cOLNegotiation.create({
        data: {
          collectionId,
          proposalAmount: input.proposalAmount,
          notes: input.notes ?? null,
          status: "OPEN",
        },
      });

      await tx.collectiveCollection.update({
        where: { id: collectionId },
        data: { status: CollectiveCollectionStatus.PAYMENT_AGREEMENT_REQUESTED },
      });

      await tx.claimTimeline.create({
        data: {
          debtClaimId: collection.debtClaimId,
          event: "COL_NEGOTIATION_CREATED",
          description: `Betalingsregeling aangevraagd: ${input.proposalAmount}.`,
        },
      });

      return created;
    });

    await NotificationService.notifyTenantStaff(
      collection.debtClaim.tenantId,
      {
        type: NotificationType.COL_NEGOTIATION_REQUESTED,
        title: "Betalingsregeling aangevraagd",
        message: `De debiteur van dossier ${collection.debtClaim.reference ?? collection.debtClaimId} heeft een betalingsregeling aangevraagd.`,
        link: `/collective-follow-up/${collectionId}`,
        entity_type: "CollectiveCollection",
        entity_id: collectionId,
      },
      { excludeUserId: requestingUserId },
    );

    return negotiation;
  };

  static decideNegotiation = async (
    negotiationId: string,
    decision: {
      action: "ACCEPT" | "ACCEPT_MODIFIED" | "REJECT";
      acceptedAmount?: number | null;
      notes?: string | null;
    },
    actorUserId: string,
  ) => {
    const negotiation = await prisma.cOLNegotiation.findUnique({
      where: { id: negotiationId },
      include: {
        collection: { include: { debtClaim: { include: { debtor: true, tenant: true } } } },
      },
    });
    if (!negotiation) throw new Error("Betalingsregeling niet gevonden.");
    if (negotiation.status !== "OPEN") {
      throw new Error("Deze betalingsregeling is al verwerkt.");
    }

    const { collection } = negotiation;
    const debtClaimReference = collection.debtClaim.reference ?? collection.debtClaimId;

    if (decision.action === "REJECT") {
      await prisma.$transaction(async (tx) => {
        await tx.cOLNegotiation.update({
          where: { id: negotiationId },
          data: { status: "REJECTED", notes: decision.notes ?? negotiation.notes },
        });
        await tx.collectiveCollection.update({
          where: { id: collection.id },
          data: { status: CollectiveCollectionStatus.AWAITING_DEBTOR_RESPONSE },
        });
        await tx.claimTimeline.create({
          data: {
            debtClaimId: collection.debtClaimId,
            event: "COL_NEGOTIATION_REJECTED",
            description: `Betalingsregeling afgewezen. Reden: ${decision.notes}`,
          },
        });
      });

      if (collection.debtClaim.debtor.user_id) {
        await NotificationService.create({
          tenant_id: collection.debtClaim.tenantId,
          user_id: collection.debtClaim.debtor.user_id,
          type: NotificationType.COL_NEGOTIATION_REJECTED,
          title: "Betalingsregeling afgewezen",
          message: `Uw voorstel voor dossier ${debtClaimReference} werd afgewezen. Reden: ${decision.notes}`,
          link: `/collective-follow-up/${collection.id}`,
          entity_type: "CollectiveCollection",
          entity_id: collection.id,
        });
      }

      return { negotiationId, status: "REJECTED" as const };
    }

    const acceptedAmount =
      decision.action === "ACCEPT_MODIFIED"
        ? decision.acceptedAmount!
        : Number(negotiation.proposalAmount);

    await prisma.$transaction(async (tx) => {
      await tx.cOLNegotiation.update({
        where: { id: negotiationId },
        data: {
          status: "ACCEPTED",
          acceptedAmount,
          notes: decision.notes ?? negotiation.notes,
        },
      });
      await tx.collectiveCollection.update({
        where: { id: collection.id },
        data: { status: CollectiveCollectionStatus.PAYMENT_AGREEMENT_ACCEPTED, finishedAt: new Date() },
      });
      await tx.claimService.updateMany({
        where: { debtClaimId: collection.debtClaimId, service: "COP" },
        data: { status: "COMPLETED", finishedAt: new Date(), finishedById: actorUserId },
      });
      await tx.claimTimeline.create({
        data: {
          debtClaimId: collection.debtClaimId,
          event: "COL_NEGOTIATION_ACCEPTED",
          description: `Betalingsregeling geaccepteerd voor ${acceptedAmount}. Collectieve Opvolging afgerond.`,
        },
      });
    });

    await BlockadeService.suspendActiveForDebtor(
      collection.debtClaim.debtorId,
      collection.debtClaim.tenantId,
    );

    if (collection.debtClaim.debtor.user_id) {
      await NotificationService.create({
        tenant_id: collection.debtClaim.tenantId,
        user_id: collection.debtClaim.debtor.user_id,
        type: NotificationType.COL_NEGOTIATION_ACCEPTED,
        title: "Betalingsregeling geaccepteerd",
        message: `Uw voorstel voor dossier ${debtClaimReference} werd geaccepteerd voor ${acceptedAmount}.`,
        link: `/collective-follow-up/${collection.id}`,
        entity_type: "CollectiveCollection",
        entity_id: collection.id,
      });
    }

    return { negotiationId, status: "ACCEPTED" as const, acceptedAmount };
  };

  // ---------------------------------------------------------------------
  // Cierre por pago total (hook automático)
  // ---------------------------------------------------------------------

  static checkAndCloseIfSettled = async (debtClaimId: string, actorUserId?: string) => {
    const collection = await prisma.collectiveCollection.findUnique({
      where: { debtClaimId },
      include: { debtClaim: { include: { debtor: true, tenant: true } } },
    });
    if (!collection || !OPEN_COLLECTIVE_COLLECTION_STATUSES.includes(collection.status)) {
      return null;
    }

    const pendingObligations = await prisma.debtClaimObligation.count({
      where: { debtClaimId, status: { in: ["PENDING", "PARTIALLY_PAID"] } },
    });
    if (pendingObligations > 0) return null;

    await prisma.$transaction(async (tx) => {
      await tx.collectiveCollection.update({
        where: { id: collection.id },
        data: { status: CollectiveCollectionStatus.PAID_IN_FULL, finishedAt: new Date() },
      });
      await tx.claimService.updateMany({
        where: { debtClaimId, service: "COP" },
        data: { status: "COMPLETED", finishedAt: new Date(), finishedById: actorUserId },
      });
      await tx.claimTimeline.create({
        data: {
          debtClaimId,
          event: "COL_COMPLETED",
          description: "Vordering volledig betaald. Collectieve Opvolging afgesloten.",
        },
      });
    });

    await BlockadeService.releaseForSettledDebtClaim(
      debtClaimId,
      collection.debtClaim.debtorId,
      collection.debtClaim.tenantId,
      actorUserId,
    );

    const debtClaimReference = collection.debtClaim.reference ?? debtClaimId;

    await NotificationService.notifyTenantStaff(collection.debtClaim.tenantId, {
      type: NotificationType.COL_PAID_IN_FULL,
      title: "Collectieve Opvolging: volledig betaald",
      message: `Dossier ${debtClaimReference} is volledig betaald via de collectieve opvolging.`,
      link: `/collective-follow-up/${collection.id}`,
      entity_type: "CollectiveCollection",
      entity_id: collection.id,
    });

    if (collection.debtClaim.debtor.user_id) {
      await NotificationService.create({
        tenant_id: collection.debtClaim.tenantId,
        user_id: collection.debtClaim.debtor.user_id,
        type: NotificationType.COL_PAID_IN_FULL,
        title: "Betaling volledig ontvangen",
        message: `Bedankt. Dossier ${debtClaimReference} is volledig betaald en afgesloten.`,
        link: `/collective-follow-up/${collection.id}`,
        entity_type: "CollectiveCollection",
        entity_id: collection.id,
      });
    }

    return collection.id;
  };

  // ---------------------------------------------------------------------
  // Opciones posteriores (sin respuesta del deudor)
  // ---------------------------------------------------------------------

  static keepActive = async (collectionId: string, actorUserId: string) => {
    const collection = await prisma.collectiveCollection.findUnique({
      where: { id: collectionId },
      include: { debtClaim: true },
    });
    if (!collection) throw new Error("Dossier niet gevonden.");

    await prisma.collectiveCollection.update({
      where: { id: collectionId },
      data: { status: CollectiveCollectionStatus.ACTIVE },
    });

    await ClaimTimelineService.logEvent(
      collection.debtClaimId,
      "STATUS_CHANGED",
      "De deelnemer heeft besloten de Collectieve Opvolging actief te houden.",
      undefined,
      actorUserId,
    );

    return { collectionId, status: CollectiveCollectionStatus.ACTIVE };
  };

  static transferToGop = async (
    collectionId: string,
    transferInput: TransferToLawyerInput,
    actorUserId: string,
  ) => {
    const collection = await prisma.collectiveCollection.findUnique({
      where: { id: collectionId },
      include: { debtClaim: { include: { debtor: true, tenant: true } } },
    });
    if (!collection) throw new Error("Dossier niet gevonden.");
    if (!OPEN_COLLECTIVE_COLLECTION_STATUSES.includes(collection.status)) {
      throw new Error("Dit dossier kan in deze status niet worden overgedragen.");
    }

    const caseTransfer = await CaseTransferService.requestTransfer(transferInput, actorUserId);

    await prisma.$transaction(async (tx) => {
      await tx.collectiveCollection.update({
        where: { id: collectionId },
        data: {
          status: CollectiveCollectionStatus.TRANSFERRED,
          finishedAt: new Date(),
          transferredToCaseTransferId: caseTransfer.id,
        },
      });
      await tx.claimService.updateMany({
        where: { debtClaimId: collection.debtClaimId, service: "COP" },
        data: { status: "COMPLETED", finishedAt: new Date(), finishedById: actorUserId },
      });
      await tx.claimTimeline.create({
        data: {
          debtClaimId: collection.debtClaimId,
          event: "COL_TRANSFERRED_TO_GOP",
          description: `Collectieve Opvolging overgedragen aan gerechtelijke opvolging (dossier ${collection.debtClaim.reference ?? collection.debtClaimId}).`,
        },
      });
    });

    if (collection.debtClaim.debtor.user_id) {
      await NotificationService.create({
        tenant_id: collection.debtClaim.tenantId,
        user_id: collection.debtClaim.debtor.user_id,
        type: NotificationType.COL_TRANSFERRED_TO_GOP,
        title: "Dossier overgedragen voor gerechtelijke opvolging",
        message: `Dossier ${collection.debtClaim.reference ?? collection.debtClaimId} werd overgedragen voor gerechtelijke opvolging.`,
        link: `/legal-processes/transfers/${caseTransfer.id}`,
        entity_type: "CollectiveCollection",
        entity_id: collection.id,
      });
    }

    return caseTransfer;
  };

  static close = async (collectionId: string, reason: string, actorUserId: string) => {
    const collection = await prisma.collectiveCollection.findUnique({
      where: { id: collectionId },
      include: { debtClaim: { include: { debtor: true, tenant: true } } },
    });
    if (!collection) throw new Error("Dossier niet gevonden.");
    if (!OPEN_COLLECTIVE_COLLECTION_STATUSES.includes(collection.status)) {
      throw new Error("Dit dossier is al afgehandeld.");
    }

    await prisma.$transaction(async (tx) => {
      await tx.collectiveCollection.update({
        where: { id: collectionId },
        data: { status: CollectiveCollectionStatus.CLOSED, finishedAt: new Date() },
      });
      await tx.claimService.updateMany({
        where: { debtClaimId: collection.debtClaimId, service: "COP" },
        data: { status: "CANCELLED", finishedAt: new Date(), finishedById: actorUserId },
      });
      await tx.claimTimeline.create({
        data: {
          debtClaimId: collection.debtClaimId,
          event: "COL_CLOSED",
          description: `Collectieve Opvolging gesloten zonder resultaat. Reden: ${reason}`,
        },
      });
    });

    if (collection.debtClaim.debtor.user_id) {
      await NotificationService.create({
        tenant_id: collection.debtClaim.tenantId,
        user_id: collection.debtClaim.debtor.user_id,
        type: NotificationType.COL_CLOSED,
        title: "Collectieve Opvolging gesloten",
        message: `De collectieve opvolging voor dossier ${collection.debtClaim.reference ?? collection.debtClaimId} werd gesloten.`,
        link: `/collective-follow-up/${collection.id}`,
        entity_type: "CollectiveCollection",
        entity_id: collection.id,
      });
    }

    return { collectionId, status: CollectiveCollectionStatus.CLOSED };
  };
}
