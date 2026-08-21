import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { ClaimTimelineService } from "@/modules/collection/services/claim-timeline.service";
import { NotificationService } from "@/modules/notification/services/notification.service";
import { NotificationType } from "@/modules/notification/constants/notification-type";
import { BlockadeService } from "@/modules/blockade/services/blockade.service";
import { PersonService } from "@/modules/collection/services/person.service";
import { CaseTransferService } from "@/modules/legal-process/services/case-transfer.service";
import { TransferToLawyerInput } from "@/modules/legal-process/services/case-transfer.validators";
import { PaymentService } from "@/modules/payment/services/payment.service";
import { PaymentType } from "@/modules/payment/services/payment.validators";
import { SettingsService } from "@/modules/settings/services/settings/settings.service";
import { TenantService } from "@/modules/tenant/services/tenant.service";
import { sendEmployerMatchNoticeEmail } from "@/modules/collective-follow-up/services/collective-collection-mail.service";
import { computeDebtClaimBalances } from "@/modules/collection/utils/debt-claim-balance";
import { formatCurrency, formatDate } from "@/shared/utils/formatters";
import {
  CollectiveCollectionStatus,
  COP_START_FEE_RATE,
  OPEN_COLLECTIVE_COLLECTION_STATUSES,
} from "@/modules/collective-follow-up/constants/collective-collection-status";

const collectiveCollectionInclude = {
  debtClaim: { include: { debtor: { include: { person: true } }, tenant: true } },
  employerTenant: { select: { id: true, name: true } },
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

  // Expedientes donde este tenant fue confirmado como empleador de un
  // deudor de OTRO tenant — permite al staff del empleador ver/gestionar
  // los COP en los que puede actuar en nombre del deudor tras el plazo de
  // gracia (ver requireDebtorOrEmployerForNegotiation). Distinto de
  // getAllForTenant, que filtra por debtClaim.tenantId (el dueño).
  static getForEmployerTenant = async (tenantId: string) => {
    const items = await prisma.collectiveCollection.findMany({
      where: { employerTenantId: tenantId },
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

  // Notificaciones reales de colaboración (empleador/deudor) — para la
  // pantalla de detalle del COP ("Bekijk collectieve reacties"). El
  // progreso del broadcast de red en sí (cuántos respondieron, match final)
  // se lee vía getNetworkQueryForCollection, no acá.
  static getNotificationsForCollection = async (collectionId: string) => {
    return prisma.cOLNotification.findMany({
      where: { collectionId },
      orderBy: { sentAt: "desc" },
    });
  };

  // Progreso agregado del broadcast de red para el tenant dueño del
  // expediente — nunca expone qué tenant respondió qué, solo el conteo y
  // el resultado final (ver submitNetworkResponse / applyEmployerMatch).
  static getNetworkQueryForCollection = async (collectionId: string) => {
    const query = await prisma.cOLNetworkQuery.findUnique({
      where: { collectionId },
      include: { responses: true },
    });
    if (!query) return null;

    const answered = query.responses.filter((r) => r.answer !== null).length;
    return {
      status: query.status,
      responseDeadline: query.responseDeadline,
      totalAsked: query.responses.length,
      answered,
    };
  };

  // Inbox de preguntas de red pendientes de respuesta para el staff de un
  // tenant participante (no el dueño del expediente).
  static getPendingNetworkQueriesForTenant = async (tenantId: string) => {
    const responses = await prisma.cOLNetworkResponse.findMany({
      where: { tenantId, answer: null, query: { status: "OPEN" } },
      include: { query: true },
      orderBy: { id: "desc" },
    });
    return responses.map((r) => ({
      queryId: r.query.id,
      personalNumber: r.query.personalNumber,
      displayName: r.query.displayName,
      responseDeadline: r.query.responseDeadline,
    }));
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
      installmentAmount: n.installmentAmount != null ? Number(n.installmentAmount) : null,
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
      // La blokkade puede estar SUSPENDED en vez de simplemente ausente —
      // el caso más común es que el deudor ya tiene un acuerdo de pago
      // aceptado (BlockadeService.suspendActiveForDebtor la suspende al
      // aceptarlo). Ese mensaje es mucho más útil para el participante que
      // el genérico "requiere blokkade activa".
      const acceptedAgreement = await prisma.agreement.findFirst({
        where: { debtClaim_id: debtClaimId, status: "ACCEPTED" },
      });
      if (acceptedAgreement) {
        return {
          allowed: false,
          reason:
            "Er is al een actieve betalingsregeling voor dit dossier — de collectieve opvolging kan niet starten zolang deze regeling loopt.",
        };
      }

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

  // Paso 1: registra la solicitud de COP y genera el cobro Sentoo de la
  // comisión CFSB del 5% (a cargo del participante que inicia la acción).
  // El COP queda en PENDING_PAYMENT — todavía no es un COP real para el
  // resto del sistema (no dispara employer check ni aviso al deudor).
  static requestStart = async (debtClaimId: string, actorUserId?: string) => {
    const canStartResult = await this.canStart(debtClaimId);
    if (!canStartResult.allowed) {
      throw new Error(canStartResult.reason ?? "Kan geen collectieve opvolging starten.");
    }

    const debtClaim = await prisma.debtClaim.findUnique({
      where: { id: debtClaimId },
      include: { tenant: true },
    });
    if (!debtClaim) throw new Error("Dossier niet gevonden.");

    const feeAmount =
      Math.round(Number(debtClaim.principalAmount) * COP_START_FEE_RATE * 100) / 100;

    const paymentResult = await PaymentService.create(debtClaim.tenantId, {
      amount: feeAmount,
      currency: debtClaim.currency,
      description: `CFSB-startvergoeding (5%) voor start Collectieve Opvolging — dossier ${
        debtClaim.reference ?? debtClaimId
      }`,
      reference: `cop_start_${debtClaimId}_${Date.now()}`,
      payment_type: PaymentType.COP_START,
    });
    if (!paymentResult.success || !paymentResult.data) {
      throw new Error(paymentResult.message || "Kon geen Sentoo-betaling aanmaken.");
    }

    const collection = await prisma.collectiveCollection.create({
      data: {
        debtClaimId,
        status: CollectiveCollectionStatus.PENDING_PAYMENT,
        startedAt: new Date(),
        startFeePaymentId: paymentResult.data.paymentId,
      },
    });

    await ClaimTimelineService.logEvent(
      debtClaimId,
      "COL_STARTED",
      `Collectieve Opvolging aangevraagd voor dossier ${
        debtClaim.reference ?? debtClaimId
      } — in afwachting van de betaling van de startvergoeding (5%).`,
      undefined,
      actorUserId,
    );

    return {
      collectionId: collection.id,
      paymentId: paymentResult.data.paymentId,
      paymentUrl: paymentResult.data.paymentUrl,
    };
  };

  // Un COP en PENDING_PAYMENT ya tiene un Payment/link de Sentoo generado
  // (ver requestStart) — `canStart` bloquea volver a llamar requestStart
  // para el mismo dossier (violaría el unique en debtClaimId), así que la
  // única forma de retomar un pago que quedó a medias es reabrir el mismo
  // link existente, no crear uno nuevo.
  static resumeStartPayment = async (collectionId: string) => {
    const collection = await prisma.collectiveCollection.findUnique({
      where: { id: collectionId },
      include: { startFeePayment: true },
    });
    if (!collection) throw new Error("Dossier niet gevonden.");
    if (collection.status !== CollectiveCollectionStatus.PENDING_PAYMENT || !collection.startFeePayment) {
      throw new Error("Er is geen openstaande startbetaling voor dit dossier.");
    }
    if (!collection.startFeePayment.payment_url) {
      throw new Error("Geen betaallink beschikbaar voor deze betaling.");
    }

    return {
      paymentId: collection.startFeePayment.id,
      paymentUrl: collection.startFeePayment.payment_url,
    };
  };

  // Punto 9 del proceso COP: una vez vencido el plazo de gracia con
  // empleador confirmado, las funciones de pago independientes del deudor
  // quedan sin efecto — el pago pasa a gestionarse exclusivamente vía el
  // empleador (mismo criterio que requireDebtorOrEmployerForNegotiation,
  // aplicado al pago en vez de a la negociación). No hace nada si el
  // debtClaim no tiene COP, o si el COP ya no está en un estado abierto.
  static assertDebtorPaymentAllowed = async (debtClaimId: string) => {
    const collection = await prisma.collectiveCollection.findUnique({ where: { debtClaimId } });
    if (!collection) return;

    const gracePeriodPassed =
      !!collection.debtorGracePeriodDeadline && collection.debtorGracePeriodDeadline <= new Date();

    if (
      gracePeriodPassed &&
      collection.employerTenantId &&
      OPEN_COLLECTIVE_COLLECTION_STATUSES.includes(collection.status)
    ) {
      throw new Error(
        "De bedenktermijn is verstreken. Deze betaling kan niet meer rechtstreeks door u worden geregistreerd — dit verloopt vanaf nu via uw werkgever.",
      );
    }
  };

  // Llamado desde process_aop_workflow.ts cuando un caso llega al punto de
  // decisión de AOP (BLK_NOTIFICATION). Si el tenant preconfiguró la
  // continuación automática (Setting col_auto_continue_from_aop), dispara
  // requestStart sin actor humano. No salta el pago del 5%: el COP igual
  // queda en PENDING_PAYMENT hasta que se confirme el Payment vía Sentoo —
  // esto solo automatiza la solicitud, no el pago.
  static tryAutoContinueFromAop = async (
    debtClaimId: string,
    tenantId: string,
    jurisdictionId: string | null,
  ) => {
    const enabled = await SettingsService.resolveBoolean(
      "col_auto_continue_from_aop",
      { tenantId, jurisdictionId },
      false,
    );
    if (!enabled) return null;

    const canStartResult = await this.canStart(debtClaimId);
    if (!canStartResult.allowed) return null;

    const result = await this.requestStart(debtClaimId, undefined);
    return result.collectionId;
  };

  // Paso 2: se llama desde el webhook de Sentoo cuando el Payment
  // COP_START se confirma como pagado. Recién acá el COP pasa a ACTIVE y
  // se dispara el resto del flujo (chequeo de empleador, aviso al deudor)
  // — mismo patrón que FinancialAgreementService.processRegistrationPaymentConfirmed.
  static processStartPaymentConfirmed = async (paymentId: string) => {
    const collection = await prisma.collectiveCollection.findUnique({
      where: { startFeePaymentId: paymentId },
      include: { debtClaim: { include: { tenant: true, debtor: { include: { person: true } } } } },
    });
    if (!collection || collection.status !== CollectiveCollectionStatus.PENDING_PAYMENT) {
      return;
    }

    const { debtClaim } = collection;

    await prisma.$transaction(async (tx) => {
      await tx.collectiveCollection.update({
        where: { id: collection.id },
        data: { status: CollectiveCollectionStatus.ACTIVE },
      });

      await tx.claimService.create({
        data: {
          debtClaimId: collection.debtClaimId,
          service: "COP",
          status: "IN_PROGRESS",
          startedAt: new Date(),
        },
      });

      await tx.claimTimeline.create({
        data: {
          debtClaimId: collection.debtClaimId,
          event: "COL_STARTED",
          description: `Betaling van de COP-startvergoeding bevestigd. Collectieve Opvolging actief voor dossier ${
            debtClaim.reference ?? collection.debtClaimId
          }.`,
        },
      });
    });

    // Best-effort: el COP ya está confirmado y activo, estos pasos no
    // deben poder revertirlo si fallan.
    try {
      await NotificationService.notifyTenantStaff(debtClaim.tenantId, {
        type: NotificationType.COL_STARTED,
        title: "Collectieve Opvolging actief",
        message: `De betaling werd bevestigd. Er is een collectieve opvolging actief voor dossier ${
          debtClaim.reference ?? collection.debtClaimId
        }.`,
        link: `/collective-follow-up/${collection.id}`,
        entity_type: "CollectiveCollection",
        entity_id: collection.id,
      });
    } catch (error) {
      console.error("Error notifying tenant staff of COP start:", error);
    }

    try {
      // Punto 3 del proceso COP: si ya se conoce el empleador de este
      // deudor (confirmado en un COP anterior), se usa directamente en vez
      // de volver a preguntarle a toda la red.
      const knownEmployerTenantId = debtClaim.debtor.person?.confirmedEmployerTenantId;
      if (knownEmployerTenantId) {
        await this.applyEmployerMatch(collection.id, knownEmployerTenantId);
      } else {
        await this.broadcastNetworkQuery(collection.id);
      }
    } catch (error) {
      console.error("Error resolving employer for COP:", error);
    }

    try {
      await this.notifyDebtorStarted(collection.id);
    } catch (error) {
      console.error("Error notifying debtor of COP start:", error);
    }

    const gracePeriodDays = await SettingsService.resolveNumber(
      "col_debtor_grace_period_days",
      { tenantId: debtClaim.tenantId },
      2,
    );
    const debtorGracePeriodDeadline = new Date();
    debtorGracePeriodDeadline.setDate(debtorGracePeriodDeadline.getDate() + gracePeriodDays);

    const updated = await prisma.collectiveCollection.update({
      where: { id: collection.id },
      data: { status: CollectiveCollectionStatus.AWAITING_DEBTOR_RESPONSE, debtorGracePeriodDeadline },
      include: collectiveCollectionInclude,
    });

    return serializeCollection(updated);
  };

  // Aplica el match de empleador ya confirmado (por un "Sí" al broadcast de
  // red) — este bloque es intencionalmente el mismo que antes hacía el
  // lookup silencioso por identification exacta, solo cambia quién lo
  // dispara (submitNetworkResponse en vez de un match automático de BD).
  private static applyEmployerMatch = async (collectionId: string, employerTenantId: string) => {
    const collection = await prisma.collectiveCollection.findUnique({
      where: { id: collectionId },
      include: {
        debtClaim: {
          include: { debtor: { include: { person: true } }, tenant: true, obligations: true },
        },
      },
    });
    if (!collection || collection.employerTenantId) return;

    await prisma.collectiveCollection.update({
      where: { id: collectionId },
      data: { employerTenantId, employerMatchedAt: new Date() },
    });

    // Cachea el empleador confirmado a nivel de Person (no de este COP en
    // particular) — así un COP futuro para el mismo deudor puede saltarse
    // el broadcast de red (ver processStartPaymentConfirmed).
    if (collection.debtClaim.debtor.person) {
      await prisma.person.update({
        where: { id: collection.debtClaim.debtor.person.id },
        data: { confirmedEmployerTenantId: employerTenantId, confirmedEmployerConfirmedAt: new Date() },
      });
    }

    await ClaimTimelineService.logEvent(
      collection.debtClaimId,
      "COL_EMPLOYER_FOUND",
      `Werkgever gevonden binnen het CFSB-netwerk voor dossier ${collection.debtClaim.reference ?? collection.debtClaimId}.`,
    );

    // No se comparte información financiera ni el contenido del expediente
    // con el empleador — solo la solicitud genérica de informar al deudor.
    await NotificationService.notifyTenantStaff(employerTenantId, {
      type: NotificationType.COL_EMPLOYER_MATCH_FOUND,
      title: "Verzoek: informeer uw medewerker",
      message:
        "Een van uw medewerkers heeft een openstaande verplichting binnen het CFSB-samenwerkingsnetwerk. Gelieve deze persoon hierover te informeren.",
      // No linkear al detalle del expediente (`/collective-follow-up/{id}`):
      // ese tenant NO es el dueño del expediente, requireTenantStaffForCollection
      // le daría un error de autorización. Su vista relevante es la pestaña
      // "Namens medewerkers" de la página general.
      link: "/collective-follow-up",
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

    // A diferencia de la notificación al empleador, acá sí se comparte con
    // el propio deudor dónde trabaja según nuestros registros — es su
    // información, y necesita saber qué pasa si no reacciona a tiempo.
    const person = collection.debtClaim.debtor.person;
    if (person?.email) {
      const employerTenant = await TenantService.getById(employerTenantId);
      const fullname =
        `${person.first_name ?? ""} ${person.last_name ?? ""}`.trim() ||
        person.business_name ||
        person.email;
      const now = new Date();
      const deadline = collection.debtorGracePeriodDeadline ?? now;
      const deadlineDate = formatDate(deadline.toISOString());
      const gracePeriodDays = Math.max(
        1,
        Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
      );
      const { payableBalance } = computeDebtClaimBalances(
        collection.debtClaim.obligations.map((o) => ({
          beneficiary: o.beneficiary,
          payer: o.payer,
          originalAmount: Number(o.originalAmount),
          balanceAmount: Number(o.balanceAmount),
        })),
      );
      const employerName = employerTenant?.name || "uw werkgever";

      try {
        await sendEmployerMatchNoticeEmail(person.email, {
          fullname,
          letterDate: formatDate(now.toISOString()),
          debtClaimReference: collection.debtClaim.reference ?? collection.debtClaimId,
          creditorName: collection.debtClaim.tenant.name,
          employerName,
          gracePeriodDays,
          outstandingAmount: formatCurrency(payableBalance),
          deadlineDate,
        });
        await ClaimTimelineService.logEvent(
          collection.debtClaimId,
          "NOTIFICATION_SENT",
          `Debiteur per e-mail geïnformeerd dat de werkgever (${employerName}) geïdentificeerd is en zal worden ingelicht bij het uitblijven van betaling vóór ${deadlineDate}.`,
        );
      } catch (error) {
        console.error("Error sending employer match notice email to debtor:", error);
      }
    }
  };

  // "Presión de red": difunde una pregunta Sí/No a todos los tenants activos
  // de la red (excepto el dueño del expediente) — sin monto ni acreedor,
  // solo el nombre y el número CFSBP del deudor. Reemplaza el match
  // silencioso por identification exacta que existía antes.
  static broadcastNetworkQuery = async (collectionId: string) => {
    const collection = await prisma.collectiveCollection.findUnique({
      where: { id: collectionId },
      include: {
        debtClaim: { include: { debtor: { include: { person: true } }, tenant: true } },
      },
    });
    if (!collection || collection.employerTenantId) return null;

    const person = collection.debtClaim.debtor.person;
    if (!person) return null;

    const personalNumber = await PersonService.ensurePersonalNumber(
      person.id,
      person.country_code,
    );
    const displayName =
      `${person.first_name ?? ""} ${person.last_name ?? ""}`.trim() ||
      person.business_name ||
      personalNumber;

    const responseWindowDays = await SettingsService.resolveNumber(
      "col_debtor_grace_period_days",
      { tenantId: collection.debtClaim.tenantId },
      2,
    );
    const responseDeadline = new Date();
    responseDeadline.setDate(responseDeadline.getDate() + responseWindowDays);

    const participants = await TenantService.getActiveParticipants();
    const targetTenantIds = participants
      .map((t) => t.id)
      .filter((id) => id !== collection.debtClaim.tenantId);
    if (targetTenantIds.length === 0) return null;

    const query = await prisma.cOLNetworkQuery.create({
      data: {
        collectionId,
        personalNumber,
        displayName,
        broadcastAt: new Date(),
        responseDeadline,
        status: "OPEN",
        responses: {
          create: targetTenantIds.map((tenantId) => ({ tenantId })),
        },
      },
    });

    await ClaimTimelineService.logEvent(
      collection.debtClaimId,
      "COL_NETWORK_BROADCAST_SENT",
      `Vraag verzonden naar ${targetTenantIds.length} deelnemer(s) in het netwerk voor dossier ${
        collection.debtClaim.reference ?? collection.debtClaimId
      }.`,
    );

    await NotificationService.notifyManyTenants(targetTenantIds, {
      type: NotificationType.COL_NETWORK_QUERY_RECEIVED,
      title: "Netwerkvraag: kent u deze persoon?",
      message: `Heeft u ${displayName} (${personalNumber}) binnen uw organisatie? Beantwoord met Ja of Nee.`,
      // Sin link, la campana de notificaciones no navega a ningún lado al
      // hacer clic (notification-bell.tsx solo hace router.push si existe).
      // El inbox de preguntas pendientes (NetworkQueryInbox) vive en la
      // vista principal de COP, no hay una pantalla de detalle propia por
      // pregunta.
      link: "/collective-follow-up",
      entity_type: "CollectiveCollection",
      entity_id: collectionId,
    });

    return query;
  };

  // Guardado de la respuesta Sí/No de un tenant a una pregunta de broadcast.
  // "Sí" confirma el empleador (vía applyEmployerMatch, sin más pasos). "No"
  // solo se registra; si ya no quedan respuestas pendientes, se cierra sin
  // match. Las respuestas de otros tenants nunca se exponen entre sí.
  static submitNetworkResponse = async (
    queryId: string,
    tenantId: string,
    answer: "YES" | "NO",
    responderId: string,
  ) => {
    const response = await prisma.cOLNetworkResponse.findUnique({
      where: { queryId_tenantId: { queryId, tenantId } },
      include: { query: true },
    });
    if (!response) throw new Error("Netwerkvraag niet gevonden voor deze organisatie.");
    if (response.answer) throw new Error("Deze vraag is al beantwoord.");

    await prisma.cOLNetworkResponse.update({
      where: { id: response.id },
      data: { answer, respondedAt: new Date(), respondedById: responderId },
    });

    if (answer === "YES") {
      await prisma.cOLNetworkQuery.update({
        where: { id: queryId },
        data: { status: "MATCHED" },
      });
      await this.applyEmployerMatch(response.query.collectionId, tenantId);
      return { matched: true };
    }

    const remainingPending = await prisma.cOLNetworkResponse.count({
      where: { queryId, answer: null },
    });
    if (remainingPending === 0) {
      await prisma.cOLNetworkQuery.update({
        where: { id: queryId },
        data: { status: "CLOSED_NO_MATCH" },
      });
    }

    return { matched: false };
  };

  // Llamado únicamente por el job periódico — cierra sin match los
  // broadcasts de red cuyo plazo de respuesta venció sin que ningún tenant
  // haya confirmado ser el empleador.
  static closeExpiredNetworkQueries = async () => {
    const expired = await prisma.cOLNetworkQuery.findMany({
      where: { status: "OPEN", responseDeadline: { lte: new Date() } },
      include: { collection: true },
    });

    for (const query of expired) {
      await prisma.cOLNetworkQuery.update({
        where: { id: query.id },
        data: { status: "CLOSED_NO_MATCH" },
      });
      await ClaimTimelineService.logEvent(
        query.collection.debtClaimId,
        "STATUS_CHANGED",
        `Netwerkvraag verlopen zonder match voor dossier ${query.collection.debtClaimId}.`,
      );
    }

    return { checked: expired.length, closed: expired.length };
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
    input: { installmentsCount: number; startDate: Date; notes?: string | null },
    requestingUserId: string,
    submitterInfo: { submittedByRole: "DEBTOR" | "EMPLOYER"; onBehalfOfEmployerTenantId?: string | null },
  ) => {
    const collection = await prisma.collectiveCollection.findUnique({
      where: { id: collectionId },
      include: { debtClaim: { include: { debtor: true, obligations: true } } },
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

    // El monto se resuelve del saldo real, no del cliente — mismo criterio
    // que "Openstaand bedrag" en AgreementForm (no editable por el
    // gebruiker).
    const { receivableBalance } = computeDebtClaimBalances(
      collection.debtClaim.obligations.map((o) => ({
        beneficiary: o.beneficiary,
        payer: o.payer,
        originalAmount: Number(o.originalAmount),
        balanceAmount: Number(o.balanceAmount),
      })),
    );
    if (receivableBalance <= 0) {
      throw new Error("Er is geen openstaand bedrag om een betalingsregeling voor aan te vragen.");
    }
    const proposalAmount = receivableBalance;
    const installmentAmount = Math.round((proposalAmount / input.installmentsCount) * 100) / 100;
    const endDate = new Date(input.startDate);
    endDate.setMonth(endDate.getMonth() + input.installmentsCount);

    const negotiation = await prisma.$transaction(async (tx) => {
      const created = await tx.cOLNegotiation.create({
        data: {
          collectionId,
          proposalAmount,
          installmentsCount: input.installmentsCount,
          installmentAmount,
          startDate: input.startDate,
          endDate,
          notes: input.notes ?? null,
          status: "OPEN",
          submittedByRole: submitterInfo.submittedByRole,
          submittedByUserId: requestingUserId,
          submittedOnBehalfOfEmployerTenantId: submitterInfo.onBehalfOfEmployerTenantId ?? null,
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
          description: `Betalingsregeling aangevraagd: ${input.installmentsCount} termijnen van ${installmentAmount} vanaf ${input.startDate.toISOString().slice(0, 10)} (totaal ${proposalAmount}).`,
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

    // El deudor no ve el pedido en la app del empleador — se le avisa
    // explícitamente que su empleador actuó en su nombre.
    if (submitterInfo.submittedByRole === "EMPLOYER" && collection.debtClaim.debtor.user_id) {
      await NotificationService.create({
        tenant_id: collection.debtClaim.tenantId,
        user_id: collection.debtClaim.debtor.user_id,
        type: NotificationType.COL_NEGOTIATION_REQUESTED_BY_EMPLOYER,
        title: "Uw werkgever heeft namens u een betalingsregeling aangevraagd",
        message: `Voor dossier ${collection.debtClaim.reference ?? collection.debtClaimId} werd een betalingsregeling van ${proposalAmount} aangevraagd door uw werkgever, namens u.`,
        link: `/collective-follow-up/${collectionId}`,
        entity_type: "CollectiveCollection",
        entity_id: collectionId,
      });
    }

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
          description: `Collectieve Opvolging overgedragen aan advocaat/deurwaarder (dossier ${collection.debtClaim.reference ?? collection.debtClaimId}).`,
        },
      });
    });

    if (collection.debtClaim.debtor.user_id) {
      await NotificationService.create({
        tenant_id: collection.debtClaim.tenantId,
        user_id: collection.debtClaim.debtor.user_id,
        type: NotificationType.COL_TRANSFERRED_TO_GOP,
        title: "Dossier overgedragen aan advocaat/deurwaarder",
        message: `Dossier ${collection.debtClaim.reference ?? collection.debtClaimId} werd overgedragen aan een advocaat/deurwaarder voor verdere behandeling.`,
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
