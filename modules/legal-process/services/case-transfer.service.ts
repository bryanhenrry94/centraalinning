import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { addDays, startOfDay } from "date-fns";
import {
  TransferToLawyerInput,
  SubmitLawyerFeeInvoiceInput,
} from "@/modules/legal-process/services/case-transfer.validators";
import { DEFAULT_GOP_FEE_RATE_PERCENT } from "@/modules/legal-process/constants/legal-process-status";
import { ClaimTimelineService } from "@/modules/collection/services/claim-timeline.service";
import { NotificationService } from "@/modules/notification/services/notification.service";
import { NotificationType } from "@/modules/notification/constants/notification-type";
import { BillingInvoiceService } from "@/modules/payment/services/billing-invoice.service";
import { sendInvoiceEmail } from "@/modules/payment/services/payment-mail.service";
import { PaymentService } from "@/modules/payment/services/payment.service";
import { PaymentType } from "@/modules/payment/services/payment.validators";
import { ParameterService } from "@/modules/settings/services/parameter/parameter.service";
import { SettingsService } from "@/modules/settings/services/settings/settings.service";
import { StorageService } from "@/infrastructure/storage/storage.service";
import { formatAmount } from "@/shared/utils/formatters";
import { CollectiveCollectionService } from "@/modules/collective-follow-up/services/collective-collection.service";

const ACCEPTANCE_WINDOW_DAYS = 7;
// Valor por defecto — el Superadministrador puede configurar la antelación
// real por isla/tenant editando el Setting
// case_transfer_acceptance_reminder_days_before (punto 14 del análisis
// CFSB), sin tocar código.
const DEFAULT_ACCEPTANCE_REMINDER_DAYS_BEFORE = 2;

const caseTransferInclude = {
  debtClaim: { include: { debtor: { include: { person: true } }, tenant: true } },
  lawyer: true,
  bailiff: true,
  legalProcess: { select: { id: true } },
  // Solo el último, para derivar el werkstatus del abogado ("In behandeling
  // door advocaat" / "In afwachting van betaling CFSB" / "Afgerond") y para
  // habilitar "Transferir a deurwaarder" (ver getCaseTransferDisplayStatusInfo).
  lawyerFeeInvoices: {
    orderBy: { createdAt: "desc" },
    take: 1,
    include: { payment: true },
  },
} satisfies Prisma.CaseTransferInclude;

type CaseTransferWithInclude = Prisma.CaseTransferGetPayload<{ include: typeof caseTransferInclude }>;

// Ver comentario equivalente en legal-process.service.ts: Decimal no cruza
// de un Server Action a un Client Component.
function serializeCaseTransfer<T extends CaseTransferWithInclude>(caseTransfer: T) {
  return {
    ...caseTransfer,
    debtClaim: {
      ...caseTransfer.debtClaim,
      principalAmount: Number(caseTransfer.debtClaim.principalAmount),
    },
    lawyerFeeInvoices: caseTransfer.lawyerFeeInvoices.map((invoice) => ({
      ...invoice,
      totalAmount: Number(invoice.totalAmount),
      cfsbFeeAmount: Number(invoice.cfsbFeeAmount),
      taxAmount: Number(invoice.taxAmount),
      payment: { ...invoice.payment, total_amount: Number(invoice.payment.total_amount) },
    })),
  };
}

export class CaseTransferService {
  static getById = async (id: string) => {
    const caseTransfer = await prisma.caseTransfer.findUnique({
      where: { id },
      include: caseTransferInclude,
    });
    return caseTransfer ? serializeCaseTransfer(caseTransfer) : null;
  };

  // Una vez que un CaseTransfer tiene un LegalProcess (vonnis registrado), el
  // GOP real ya existe — se excluye de estos listados para que la tabla no
  // siga mostrando la fila de "transferencia" como si aún faltara registrar
  // el vonnis (ver LegalProcessService.getAllForTenant, que sí lo muestra).
  static getForLawyerUser = async (userId: string) => {
    const items = await prisma.caseTransfer.findMany({
      where: { lawyer: { userId }, legalProcess: null },
      include: caseTransferInclude,
      orderBy: { createdAt: "desc" },
    });
    return items.map(serializeCaseTransfer);
  };

  static getForBailiffUser = async (userId: string) => {
    const items = await prisma.caseTransfer.findMany({
      where: { bailiff: { user_id: userId }, legalProcess: null },
      include: caseTransferInclude,
      orderBy: { createdAt: "desc" },
    });
    return items.map(serializeCaseTransfer);
  };

  static getAllForTenant = async (tenantId: string) => {
    const items = await prisma.caseTransfer.findMany({
      where: { debtClaim: { tenantId }, legalProcess: null },
      include: caseTransferInclude,
      orderBy: { createdAt: "desc" },
    });
    return items.map(serializeCaseTransfer);
  };

  // La "noodoverdracht" (AT-013) solo tiene sentido para reemplazar a un
  // advocaat/deurwaarder YA asignado (overlijden/arbeidsongeschiktheid) — si
  // este es el primer intento de transferencia del dossier, esa opción no
  // debe mostrarse. Ver TransferToLawyerDialog.
  static existsForDebtClaim = async (debtClaimId: string) => {
    const count = await prisma.caseTransfer.count({ where: { debtClaimId } });
    return count > 0;
  };

  // ---------------------------------------------------------------------
  // Solicitud de transferencia (sin costo)
  // ---------------------------------------------------------------------

  // La transferencia a un abogado/alguacil ya no genera ningún costo CFSB
  // (pedido del sponsor, ver docs): no se genera Payment/BillingInvoice ni
  // se valida ningún pago previo. El dossier se crea directamente en
  // PENDING_ACCEPTANCE, se notifica de inmediato al profesional
  // seleccionado, y queda a la espera de su aceptación o rechazo. La
  // transferencia en sí NO activa el GOP — el GOP solo nace al registrar la
  // sentencia (ver LegalProcessService.registerFirstVerdict).
  static requestTransfer = async (input: TransferToLawyerInput, actorUserId: string) => {
    const debtClaim = await prisma.debtClaim.findUnique({ where: { id: input.debtClaimId } });
    if (!debtClaim) throw new Error("Dossier (DebtClaim) niet gevonden");

    // El GOP es el último escalón: se habilita cuando la fase del AOP llegó
    // a BLK_NOTIFICATION ("Blokkade"), O cuando ya existe una Blokkade
    // ACTIVE para este dossier (p.ej. originada directamente, o vía un COP
    // que nunca pasó por el flujo AOP). Esta es una precondición de flujo,
    // no un pago — se mantiene.
    const aop = await prisma.administrativeCollection.findUnique({
      where: { debtClaimId: input.debtClaimId },
      include: { steps: { orderBy: { id: "desc" }, take: 1 } },
    });
    const aopReachedBlockade = aop?.steps[0]?.step === "BLK_NOTIFICATION";

    const activeBlockade = aopReachedBlockade
      ? null
      : await prisma.blockade.findFirst({
          where: { originDebtClaimId: input.debtClaimId, status: "ACTIVE" },
        });

    if (!aopReachedBlockade && !activeBlockade) {
      throw new Error(
        "Het dossier kan alleen worden overgedragen aan gerechtelijke opvolging als de AOP-fase Blokkade is bereikt, of als er een actieve economische blokkade bestaat voor dit dossier.",
      );
    }

    let lawyer: { userId: string | null; firstName: string; lastName: string } | null = null;
    let bailiff: { user_id: string | null; fullname: string } | null = null;
    if (input.lawyerId) {
      lawyer = await prisma.lawyer.findUnique({ where: { id: input.lawyerId } });
      if (!lawyer) throw new Error("Advocaat niet gevonden");
    } else if (input.bailiffId) {
      bailiff = await prisma.bailiff.findUnique({ where: { id: input.bailiffId } });
      if (!bailiff) throw new Error("Deurwaarder niet gevonden");
    } else {
      throw new Error("Selecteer een advocaat of een deurwaarder.");
    }

    // Si ya existe una transferencia notificada/en curso para este dossier y
    // esta parte, no hay nada más que hacer — devolver tal cual.
    const existing = await prisma.caseTransfer.findFirst({
      where: {
        debtClaimId: input.debtClaimId,
        lawyerId: input.lawyerId ?? null,
        bailiffId: input.bailiffId ?? null,
        status: { in: ["PENDING_ACCEPTANCE", "ACCEPTED", "WORK_COMPLETED"] },
      },
    });
    if (existing) return { caseTransferId: existing.id };

    const caseTransfer = await prisma.caseTransfer.create({
      data: {
        debtClaimId: input.debtClaimId,
        lawyerId: input.lawyerId ?? null,
        bailiffId: input.bailiffId ?? null,
        status: "PENDING_ACCEPTANCE",
        acceptanceDeadline: new Date(Date.now() + ACCEPTANCE_WINDOW_DAYS * 24 * 60 * 60 * 1000),
        isEmergencyTransfer: input.isEmergencyTransfer ?? false,
        emergencyReason: input.isEmergencyTransfer ? input.emergencyReason : null,
      },
    });

    const assignedLabel = lawyer
      ? `advocaat ${lawyer.firstName} ${lawyer.lastName}`
      : `deurwaarder ${bailiff!.fullname}`;
    const emergencyPrefix = input.isEmergencyTransfer ? "[NOODOVERDRACHT] " : "";

    await ClaimTimelineService.logEvent(
      caseTransfer.debtClaimId,
      "GOP_STARTED",
      `${emergencyPrefix}Dossier overgedragen aan ${assignedLabel}${
        input.isEmergencyTransfer ? ` — reden: ${input.emergencyReason}` : ""
      }`,
      { lawyerId: caseTransfer.lawyerId, bailiffId: caseTransfer.bailiffId },
      actorUserId,
    );

    const assignedUserId = lawyer?.userId ?? bailiff?.user_id;
    if (assignedUserId) {
      await NotificationService.create({
        tenant_id: debtClaim.tenantId,
        user_id: assignedUserId,
        type: NotificationType.LEGAL_PROCESS_TRANSFER_REQUEST,
        title: input.isEmergencyTransfer ? "Nieuw spoeddossier overgedragen" : "Nieuw dossier overgedragen",
        message: input.isEmergencyTransfer
          ? `Dossier ${debtClaim.reference} werd met spoed (noodoverdracht) aan je overgedragen: ${input.emergencyReason}`
          : `Dossier ${debtClaim.reference} werd aan je overgedragen.`,
        link: `/legal-processes/transfers/${caseTransfer.id}`,
        entity_type: "CaseTransfer",
        entity_id: caseTransfer.id,
      });
    }

    return { caseTransferId: caseTransfer.id };
  };

  // Ruta legada: solo relevante para un CaseTransfer que haya quedado en
  // PENDING_PAYMENT antes de que la transferencia se volviera gratuita (ver
  // requestTransfer). Nuevas transferencias nunca pasan por este estado.
  static confirmTransferPayment = async (paymentId: string) => {
    const caseTransfer = await prisma.caseTransfer.findUnique({
      where: { paymentId },
      include: caseTransferInclude,
    });
    if (!caseTransfer || caseTransfer.status !== "PENDING_PAYMENT") return;

    const updated = await prisma.caseTransfer.update({
      where: { id: caseTransfer.id },
      data: {
        status: "PENDING_ACCEPTANCE",
        acceptanceDeadline: new Date(Date.now() + ACCEPTANCE_WINDOW_DAYS * 24 * 60 * 60 * 1000),
      },
      include: caseTransferInclude,
    });

    await prisma.billingInvoice.updateMany({
      where: { payment_id: paymentId },
      data: { status: "paid" },
    });

    const assignedLabel = updated.lawyer
      ? `advocaat ${updated.lawyer.firstName} ${updated.lawyer.lastName}`
      : `deurwaarder ${updated.bailiff!.fullname}`;
    const emergencyPrefix = updated.isEmergencyTransfer ? "[NOODOVERDRACHT] " : "";

    await ClaimTimelineService.logEvent(
      updated.debtClaimId,
      "GOP_STARTED",
      `${emergencyPrefix}Dossier overgedragen aan ${assignedLabel}${
        updated.isEmergencyTransfer ? ` — reden: ${updated.emergencyReason}` : ""
      }`,
      { lawyerId: updated.lawyerId, bailiffId: updated.bailiffId },
    );

    const assignedUserId = updated.lawyer?.userId ?? updated.bailiff?.user_id;
    if (assignedUserId) {
      await NotificationService.create({
        tenant_id: updated.debtClaim.tenantId,
        user_id: assignedUserId,
        type: NotificationType.LEGAL_PROCESS_TRANSFER_REQUEST,
        title: updated.isEmergencyTransfer ? "Nieuw spoeddossier overgedragen" : "Nieuw dossier overgedragen",
        message: updated.isEmergencyTransfer
          ? `Dossier ${updated.debtClaim.reference} werd met spoed (noodoverdracht) aan je overgedragen: ${updated.emergencyReason}`
          : `Dossier ${updated.debtClaim.reference} werd aan je overgedragen.`,
        link: `/legal-processes/transfers/${updated.id}`,
        entity_type: "CaseTransfer",
        entity_id: updated.id,
      });
    }

    // Si esta transferencia vino de un COP cerrado sin resultado, recién
    // ahora (pago confirmado) el COP pasa a TRANSFERRED — ver
    // CollectiveCollectionService.transferToGop.
    const collectiveCollection = await prisma.collectiveCollection.findFirst({
      where: { transferredToCaseTransferId: updated.id },
    });
    if (collectiveCollection && collectiveCollection.status !== "TRANSFERRED") {
      await prisma.collectiveCollection.update({
        where: { id: collectiveCollection.id },
        data: { status: "TRANSFERRED", finishedAt: new Date() },
      });

      if (updated.debtClaim.debtor.user_id) {
        await NotificationService.create({
          tenant_id: updated.debtClaim.tenantId,
          user_id: updated.debtClaim.debtor.user_id,
          type: NotificationType.COL_TRANSFERRED_TO_GOP,
          title: "Dossier overgedragen aan advocaat/deurwaarder",
          message: `Dossier ${updated.debtClaim.reference ?? updated.debtClaimId} werd overgedragen aan een advocaat/deurwaarder voor verdere behandeling.`,
          link: `/legal-processes/transfers/${updated.id}`,
          entity_type: "CollectiveCollection",
          entity_id: collectiveCollection.id,
        });
      }
    }

    return updated;
  };

  // ---------------------------------------------------------------------
  // Aceptación / rechazo / cancelación
  // ---------------------------------------------------------------------

  static acceptTransfer = async (caseTransferId: string, actorUserId?: string) => {
    const caseTransfer = await prisma.caseTransfer.findUnique({
      where: { id: caseTransferId },
      include: { debtClaim: true },
    });
    if (!caseTransfer) throw new Error("Dossier niet gevonden");
    if (caseTransfer.status !== "PENDING_ACCEPTANCE") {
      throw new Error("Het dossier is niet in afwachting van acceptatie");
    }

    // De advocaat, of de deurwaarder in de rechtstreekse route, behoudt
    // toegang tot bestaande dossiers, maar mag geen nieuwe overdracht
    // accepteren zolang er een onbetaalde CFSB-vergoeding openstaat (feedback
    // sponsor).
    if (caseTransfer.lawyerId) {
      const outstandingFee = await prisma.lawyerFeeInvoice.findFirst({
        where: { status: "PENDING_PAYMENT", caseTransfer: { lawyerId: caseTransfer.lawyerId } },
      });
      if (outstandingFee) {
        throw new Error(
          "U heeft nog een openstaande CFSB-vergoeding. Betaal deze eerst voordat u een nieuw dossier kunt accepteren.",
        );
      }
    } else if (caseTransfer.bailiffId) {
      const outstandingFee = await prisma.lawyerFeeInvoice.findFirst({
        where: {
          status: "PENDING_PAYMENT",
          caseTransfer: { bailiffId: caseTransfer.bailiffId, lawyerId: null },
        },
      });
      if (outstandingFee) {
        throw new Error(
          "U heeft nog een openstaande CFSB-vergoeding. Betaal deze eerst voordat u een nieuw dossier kunt accepteren.",
        );
      }
    }

    const acceptedByLawyer = !!caseTransfer.lawyerId;

    const updated = await prisma.caseTransfer.update({
      where: { id: caseTransferId },
      data: { status: "ACCEPTED", respondedAt: new Date() },
    });

    // Geen "Gerechtelijke procedure gestart" hier — het GOP bestaat pas
    // zodra de deurwaarder een vonnis registreert (registerFirstVerdict),
    // niet bij het enkel accepteren van de overdracht (feedback sponsor,
    // punt 10: "Dossieroverdracht → GOP" klopt niet).
    await ClaimTimelineService.logEvent(
      caseTransfer.debtClaimId,
      acceptedByLawyer ? "LAWYER_ASSIGNED" : "BAILIFF_ASSIGNED",
      `De ${acceptedByLawyer ? "advocaat" : "deurwaarder"} heeft het dossier geaccepteerd.`,
      undefined,
      actorUserId,
    );

    // Zodra de overdracht is geaccepteerd, stopt de actieve AOP-opvolging
    // door CFSB (sponsor-flow punt 2) — anders blijft het aanmaning/sommatie-
    // schema (process_aop_workflow) doorlopen terwijl de advocaat/deurwaarder
    // het dossier al inhoudelijk behandelt. Alleen relevant als de AOP nog
    // ACTIVE was (p.ej. de overdracht kwam via een losstaande actieve
    // Blokkade, niet via een AOP die al BLK_NOTIFICATION bereikte).
    const closedAop = await prisma.administrativeCollection.updateMany({
      where: { debtClaimId: caseTransfer.debtClaimId, status: "ACTIVE" },
      data: { status: "CLOSED", finishedAt: new Date() },
    });
    if (closedAop.count > 0) {
      await ClaimTimelineService.logEvent(
        caseTransfer.debtClaimId,
        "STATUS_CHANGED",
        "De actieve AOP-opvolging is stopgezet nu het dossier is overgedragen aan de advocaat/deurwaarder.",
        undefined,
        actorUserId,
      );
    }

    await NotificationService.notifyTenantStaff(
      caseTransfer.debtClaim.tenantId,
      {
        type: NotificationType.LEGAL_PROCESS_ACCEPTED,
        title: "Dossier geaccepteerd",
        message: `De ${acceptedByLawyer ? "advocaat" : "deurwaarder"} heeft dossier ${caseTransfer.debtClaim.reference} geaccepteerd.`,
        link: `/legal-processes/transfers/${updated.id}`,
        entity_type: "CaseTransfer",
        entity_id: updated.id,
      },
      { excludeUserId: actorUserId },
    );

    return updated;
  };

  static rejectTransfer = async (caseTransferId: string, reason: string, actorUserId?: string) => {
    const caseTransfer = await prisma.caseTransfer.findUnique({
      where: { id: caseTransferId },
      include: { debtClaim: true },
    });
    if (!caseTransfer) throw new Error("Dossier niet gevonden");
    if (caseTransfer.status !== "PENDING_ACCEPTANCE") {
      throw new Error("Het dossier is niet in afwachting van acceptatie");
    }

    const rejectedByLawyer = !!caseTransfer.lawyerId;

    const updated = await prisma.caseTransfer.update({
      where: { id: caseTransferId },
      data: { status: "REJECTED", rejectionReason: reason, respondedAt: new Date() },
    });

    await ClaimTimelineService.logEvent(
      caseTransfer.debtClaimId,
      "STATUS_CHANGED",
      `De ${rejectedByLawyer ? "advocaat" : "deurwaarder"} heeft het dossier afgewezen: ${reason}`,
      undefined,
      actorUserId,
    );

    // Ruta Inteligente CFSB (punto 8): si esta transferencia se originó
    // desde un COP (Collectieve Opvolging), la cancelación automática debe
    // devolverle al participante las dos únicas salidas válidas — reactivar
    // el mismo COP sin costo, o elegir otro profesional — en vez de dejar
    // el dossier varado en "Transferido". No-op si esta transferencia no
    // vino de un COP.
    let reopenedCollectiveCollectionId: string | null = null;
    try {
      reopenedCollectiveCollectionId = await CollectiveCollectionService.reopenAfterTransferRejected(
        caseTransferId,
        actorUserId,
      );
    } catch (error) {
      console.error("Error reopening COP after transfer rejection:", error);
    }

    await NotificationService.notifyTenantStaff(caseTransfer.debtClaim.tenantId, {
      type: NotificationType.LEGAL_PROCESS_REJECTED,
      title: "Dossier afgewezen",
      message: reopenedCollectiveCollectionId
        ? `De ${rejectedByLawyer ? "advocaat" : "deurwaarder"} heeft dossier ${caseTransfer.debtClaim.reference} afgewezen: ${reason}. Kies: opnieuw Collectieve Opvolging uitvoeren zonder kosten, of een andere advocaat/deurwaarder selecteren.`
        : `De ${rejectedByLawyer ? "advocaat" : "deurwaarder"} heeft dossier ${caseTransfer.debtClaim.reference} afgewezen: ${reason}. Selecteer een andere advocaat of deurwaarder.`,
      link: reopenedCollectiveCollectionId
        ? `/collective-follow-up/${reopenedCollectiveCollectionId}`
        : `/legal-processes/transfers/${updated.id}`,
      entity_type: reopenedCollectiveCollectionId ? "CollectiveCollection" : "CaseTransfer",
      entity_id: reopenedCollectiveCollectionId ?? updated.id,
    });

    return updated;
  };

  // ---------------------------------------------------------------------
  // Plazo de aceptación (AT-012/AT-013): recordatorio día 5, decisión del
  // participante día 7. El plazo NUNCA vence ni se rechaza automáticamente
  // — solo se notifica; el participante decide vía extendAcceptanceDeadline
  // o rejectTransfer (llamado por él mismo, ver requireTenantStaffForCaseTransfer
  // en case-transfer.actions.ts). Ese ciclo puede repetirse cada 7 días.
  // ---------------------------------------------------------------------

  // Llamado por el job programado check_case_transfer_deadlines.
  static sendAcceptanceReminders = async () => {
    const now = new Date();
    const today = startOfDay(now);
    let reminders = 0;
    let deadlineNotices = 0;

    const pending = await prisma.caseTransfer.findMany({
      where: { status: "PENDING_ACCEPTANCE", acceptanceDeadline: { not: null } },
      include: { debtClaim: { include: { tenant: true } }, lawyer: true, bailiff: true },
    });

    for (const caseTransfer of pending) {
      const deadline = caseTransfer.acceptanceDeadline!;
      const assignedUserId = caseTransfer.lawyer?.userId ?? caseTransfer.bailiff?.user_id;
      const assignedLabel = caseTransfer.lawyer
        ? `advocaat ${caseTransfer.lawyer.firstName} ${caseTransfer.lawyer.lastName}`
        : `deurwaarder ${caseTransfer.bailiff!.fullname}`;
      const tenant = caseTransfer.debtClaim.tenant;
      const reminderDaysBefore = await SettingsService.resolveNumber(
        "case_transfer_acceptance_reminder_days_before",
        { tenantId: tenant.id, jurisdictionId: tenant.jurisdictionId },
        DEFAULT_ACCEPTANCE_REMINDER_DAYS_BEFORE,
      );

      const alreadyNotifiedToday = async (type: NotificationType) =>
        (await prisma.notification.count({
          where: {
            entity_type: "CaseTransfer",
            entity_id: caseTransfer.id,
            type,
            created_at: { gte: today },
          },
        })) > 0;

      // Día 5: recordatorio al abogado/alguacil asignado.
      if (
        deadline > now &&
        deadline <= addDays(now, reminderDaysBefore) &&
        assignedUserId &&
        !(await alreadyNotifiedToday(NotificationType.CASE_TRANSFER_ACCEPTANCE_REMINDER))
      ) {
        await NotificationService.create({
          tenant_id: caseTransfer.debtClaim.tenantId,
          user_id: assignedUserId,
          type: NotificationType.CASE_TRANSFER_ACCEPTANCE_REMINDER,
          title: "Herinnering: dossier wacht op acceptatie",
          message: `Je hebt tot ${deadline.toLocaleDateString()} om dossier ${caseTransfer.debtClaim.reference} te accepteren of af te wijzen.`,
          link: `/legal-processes/transfers/${caseTransfer.id}`,
          entity_type: "CaseTransfer",
          entity_id: caseTransfer.id,
        });
        reminders++;
      }

      // Día 7: el plazo venció — se notifica al participante, que decide
      // (extender 7 días más o elegir otro profesional). Se repite cada día
      // que siga sin resolverse, para que la decisión pendiente no se pierda.
      if (
        deadline <= now &&
        !(await alreadyNotifiedToday(NotificationType.CASE_TRANSFER_ACCEPTANCE_DEADLINE_REACHED))
      ) {
        await NotificationService.notifyTenantStaff(caseTransfer.debtClaim.tenantId, {
          type: NotificationType.CASE_TRANSFER_ACCEPTANCE_DEADLINE_REACHED,
          title: "Beslissing vereist: acceptatietermijn verstreken",
          message: `De ${assignedLabel} heeft niet binnen de termijn gereageerd op dossier ${caseTransfer.debtClaim.reference}. Beslis of je 7 dagen extra toekent of een andere professional selecteert.`,
          link: `/legal-processes/transfers/${caseTransfer.id}`,
          entity_type: "CaseTransfer",
          entity_id: caseTransfer.id,
        });
        deadlineNotices++;
      }
    }

    return { reminders, deadlineNotices };
  };

  // El participante concede 7 días más al mismo abogado/alguacil asignado.
  static extendAcceptanceDeadline = async (caseTransferId: string, actorUserId?: string) => {
    const caseTransfer = await prisma.caseTransfer.findUnique({
      where: { id: caseTransferId },
      include: { debtClaim: true, lawyer: true, bailiff: true },
    });
    if (!caseTransfer) throw new Error("Dossier niet gevonden");
    if (caseTransfer.status !== "PENDING_ACCEPTANCE") {
      throw new Error("Het dossier is niet in afwachting van acceptatie");
    }

    const newDeadline = new Date(Date.now() + ACCEPTANCE_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const updated = await prisma.caseTransfer.update({
      where: { id: caseTransferId },
      data: { acceptanceDeadline: newDeadline },
    });

    const assignedLabel = caseTransfer.lawyer
      ? `advocaat ${caseTransfer.lawyer.firstName} ${caseTransfer.lawyer.lastName}`
      : `deurwaarder ${caseTransfer.bailiff!.fullname}`;

    await ClaimTimelineService.logEvent(
      caseTransfer.debtClaimId,
      "STATUS_CHANGED",
      `De deelnemer heeft de acceptatietermijn met ${ACCEPTANCE_WINDOW_DAYS} dagen verlengd voor ${assignedLabel} (nieuwe deadline: ${newDeadline.toLocaleDateString()}).`,
      undefined,
      actorUserId,
    );

    const assignedUserId = caseTransfer.lawyer?.userId ?? caseTransfer.bailiff?.user_id;
    if (assignedUserId) {
      await NotificationService.create({
        tenant_id: caseTransfer.debtClaim.tenantId,
        user_id: assignedUserId,
        type: NotificationType.CASE_TRANSFER_ACCEPTANCE_EXTENDED,
        title: "Je acceptatietermijn is verlengd",
        message: `De deelnemer heeft je ${ACCEPTANCE_WINDOW_DAYS} extra dagen toegekend om dossier ${caseTransfer.debtClaim.reference} te accepteren of af te wijzen (nieuwe termijn: ${newDeadline.toLocaleDateString()}).`,
        link: `/legal-processes/transfers/${updated.id}`,
        entity_type: "CaseTransfer",
        entity_id: updated.id,
      });
    }

    return updated;
  };

  // ---------------------------------------------------------------------
  // Power of attorney: solo el participante puede concederlo o revocarlo.
  // Sin esto, el abogado/alguacil asignado solo puede registrar propuestas
  // de acuerdo de pago (AgreementService.create); decidir queda siempre en
  // manos del participante salvo que esto esté en true (ver
  // AgreementService.decide).
  // ---------------------------------------------------------------------

  static setPowerOfAttorney = async (
    caseTransferId: string,
    granted: boolean,
    note: string | undefined,
    actorUserId?: string,
  ) => {
    const caseTransfer = await prisma.caseTransfer.findUnique({
      where: { id: caseTransferId },
      include: { debtClaim: true, lawyer: true, bailiff: true },
    });
    if (!caseTransfer) throw new Error("Dossier niet gevonden");

    const updated = await prisma.caseTransfer.update({
      where: { id: caseTransferId },
      data: {
        hasPowerOfAttorney: granted,
        powerOfAttorneyGrantedAt: granted ? new Date() : null,
        powerOfAttorneyNote: granted ? (note ?? null) : null,
      },
    });

    const assignedLabel = caseTransfer.lawyer
      ? `advocaat ${caseTransfer.lawyer.firstName} ${caseTransfer.lawyer.lastName}`
      : caseTransfer.bailiff
        ? `deurwaarder ${caseTransfer.bailiff.fullname}`
        : null;

    await ClaimTimelineService.logEvent(
      caseTransfer.debtClaimId,
      "STATUS_CHANGED",
      granted
        ? `De deelnemer heeft een volmacht (power of attorney) verleend aan ${assignedLabel ?? "de toegewezen professional"}.${note ? ` ${note}` : ""}`
        : `De deelnemer heeft de volmacht (power of attorney) ingetrokken.`,
      { hasPowerOfAttorney: granted, note: note ?? null },
      actorUserId,
    );

    const assignedUserId = caseTransfer.lawyer?.userId ?? caseTransfer.bailiff?.user_id;
    if (assignedUserId) {
      await NotificationService.create({
        tenant_id: caseTransfer.debtClaim.tenantId,
        user_id: assignedUserId,
        type: NotificationType.CASE_TRANSFER_POWER_OF_ATTORNEY_CHANGED,
        title: granted ? "Volmacht verleend" : "Volmacht ingetrokken",
        message: granted
          ? `De deelnemer heeft je volmacht gegeven om zelfstandig te beslissen over betalingsregelingen voor dossier ${caseTransfer.debtClaim.reference}.`
          : `De deelnemer heeft je volmacht ingetrokken voor betalingsregelingen van dossier ${caseTransfer.debtClaim.reference}. Beslissingen vereisen weer zijn goedkeuring.`,
        link: `/legal-processes/transfers/${updated.id}`,
        entity_type: "CaseTransfer",
        entity_id: updated.id,
      });
    }

    return updated;
  };

  // Solo el participante puede cancelar, y únicamente mientras no exista un
  // LegalProcess real (i.e. todavía no se registró ningún vonnis).
  static cancelTransfer = async (caseTransferId: string, reason: string, actorUserId?: string) => {
    const caseTransfer = await prisma.caseTransfer.findUnique({
      where: { id: caseTransferId },
      include: { debtClaim: true, bailiff: true, lawyer: true, legalProcess: true },
    });
    if (!caseTransfer) throw new Error("Dossier niet gevonden.");
    if (["REJECTED", "CANCELLED"].includes(caseTransfer.status)) {
      throw new Error("Het dossier is al afgewezen of geannuleerd");
    }
    if (caseTransfer.legalProcess) {
      throw new Error("Een dossier met een geregistreerd vonnis kan niet meer geannuleerd worden");
    }

    const updated = await prisma.caseTransfer.update({
      where: { id: caseTransferId },
      data: { status: "CANCELLED", cancelledAt: new Date(), cancelReason: reason },
    });

    await prisma.claimService.updateMany({
      where: { debtClaimId: caseTransfer.debtClaimId, service: "GOP" },
      data: { status: "CANCELLED", finishedAt: new Date(), finishedById: actorUserId },
    });

    await ClaimTimelineService.logEvent(
      caseTransfer.debtClaimId,
      "STATUS_CHANGED",
      `Dossieroverdracht geannuleerd door de deelnemer: ${reason}`,
      undefined,
      actorUserId,
    );

    await NotificationService.notifyTenantStaff(caseTransfer.debtClaim.tenantId, {
      type: NotificationType.GOP_CANCELLED,
      title: "Overdracht geannuleerd",
      message: `Dossier ${caseTransfer.debtClaim.reference} werd geannuleerd: ${reason}`,
      link: `/legal-processes/transfers/${updated.id}`,
      entity_type: "CaseTransfer",
      entity_id: updated.id,
    });

    const assignedUserId = caseTransfer.lawyer?.userId ?? caseTransfer.bailiff?.user_id;
    if (assignedUserId) {
      await NotificationService.create({
        tenant_id: caseTransfer.debtClaim.tenantId,
        user_id: assignedUserId,
        type: NotificationType.GOP_CANCELLED,
        title: "Overdracht geannuleerd",
        message: `De deelnemer heeft de dossieroverdracht van dossier ${caseTransfer.debtClaim.reference} geannuleerd.`,
        link: `/legal-processes/transfers/${updated.id}`,
        entity_type: "CaseTransfer",
        entity_id: updated.id,
      });
    }

    return updated;
  };

  // ---------------------------------------------------------------------
  // Finalización del trabajo del abogado: honorarios + comisión CFSB (5%)
  // ---------------------------------------------------------------------

  static submitLawyerFeeInvoice = async (
    params: SubmitLawyerFeeInvoiceInput & {
      fileName: string;
      mimeType: string;
      size: number;
      buffer: Buffer;
      verdictFileName?: string;
      verdictMimeType?: string;
      verdictSize?: number;
      verdictBuffer?: Buffer;
    },
    actorUserId?: string,
  ) => {
    const caseTransfer = await prisma.caseTransfer.findUnique({
      where: { id: params.caseTransferId },
      include: { debtClaim: true, lawyer: true, bailiff: true },
    });
    if (!caseTransfer) throw new Error("Dossier niet gevonden");
    if (caseTransfer.status !== "ACCEPTED") {
      throw new Error(`Kan geen kostenfactuur registreren in de status ${caseTransfer.status}.`);
    }

    // Rechtstreekse route naar de deurwaarder (geen advocaat): enkel de "Geen
    // vonnis"-afronding gebruikt dit formulier — is er wél een vonnis, dan
    // registreert de deurwaarder dat rechtstreeks via "Vonnis registreren"
    // (zie CaseTransferService.registerFirstVerdict), zonder kostenfactuur
    // hier.
    const isDirectBailiffPath = !caseTransfer.lawyer;
    if (isDirectBailiffPath) {
      if (!caseTransfer.bailiff) throw new Error("Dit dossier heeft geen toegewezen deurwaarder.");
      if (params.outcome === "GERECHTELIJK" && params.hasVerdict === true) {
        throw new Error(
          "Is er een vonnis, registreer dit dan via 'Vonnis registreren' — niet via deze uitkomstregistratie.",
        );
      }
      if (params.bailiffId) {
        throw new Error("Er is al een deurwaarder toegewezen aan dit dossier.");
      }
    }

    const hasVerdict = !isDirectBailiffPath && params.outcome === "GERECHTELIJK" && params.hasVerdict === true;
    if (hasVerdict && !params.verdictBuffer) {
      throw new Error("Upload het vonnisdocument.");
    }
    if (hasVerdict && !params.bailiffId) {
      throw new Error("Selecteer de deurwaarder voor tenuitvoerlegging.");
    }
    if (hasVerdict && params.bailiffId) {
      const selectedBailiff = await prisma.bailiff.findUnique({ where: { id: params.bailiffId } });
      if (!selectedBailiff) throw new Error("Deurwaarder niet gevonden");
    }

    const existingPending = await prisma.lawyerFeeInvoice.findFirst({
      where: { caseTransferId: caseTransfer.id, status: "PENDING_PAYMENT" },
    });
    if (existingPending) {
      throw new Error("Er is al een kostenfactuur in afwachting van betaling voor dit dossier.");
    }

    const tenantId = caseTransfer.debtClaim.tenantId;
    const sanitizedName = `${crypto.randomUUID()}-${params.fileName}`.replace(/\s+/g, "-");
    const folder = `${tenantId}/case-transfers/${caseTransfer.id}/lawyer-fee-invoices`;
    const storageKey = await StorageService.uploadFile(
      folder,
      sanitizedName,
      params.mimeType,
      params.buffer,
    );

    // ABB por isla/jurisdicción del tenant (punto 13 del análisis CFSB) —
    // cae al Parameter global si el tenant no tiene jurisdiction asignada.
    const parameter = await ParameterService.getParameterForTenant(tenantId);
    const tenantForFeeRate = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { jurisdictionId: true },
    });
    const gopFeePercent = await SettingsService.resolveNumber(
      "gop_fee_rate",
      { tenantId, jurisdictionId: tenantForFeeRate?.jurisdictionId },
      DEFAULT_GOP_FEE_RATE_PERCENT,
    );
    const fee = Math.round(params.totalAmount * (gopFeePercent / 100) * 100) / 100;
    const tax_rate = parameter?.abb_rate ?? 0;
    const tax_amount = Math.round(((fee * tax_rate) / 100) * 100) / 100;
    const total_with_tax = fee + tax_amount;

    const concept = `CFSB-commissie (5%) op ${
      isDirectBailiffPath ? "deurwaarderskosten" : "advocaatkosten"
    } — dossier ${caseTransfer.debtClaim.reference ?? caseTransfer.debtClaimId}`;

    const paymentResult = await PaymentService.create(tenantId, {
      amount: total_with_tax,
      currency: "USD",
      description: concept,
      reference: `gop_${isDirectBailiffPath ? "bailiff_outcome" : "lawyer"}_fee_${caseTransfer.id}_${Date.now()}`,
      payment_type: isDirectBailiffPath ? PaymentType.GOP_BAILIFF_OUTCOME_FEE : PaymentType.GOP_LAWYER_FEE,
    });
    if (!paymentResult.success || !paymentResult.data) {
      throw new Error(paymentResult.message || "Kon geen Sentoo-betaling aanmaken");
    }

    const invoice_number = await BillingInvoiceService.generateInvoiceNumber();
    const invoice = await BillingInvoiceService.create(
      {
        invoice_number,
        issue_date: new Date(),
        due_date: new Date(),
        description: concept,
        status: "unpaid",
        tenant_id: tenantId,
        currency: "USD",
        amount: total_with_tax,
        invoice_details: [
          {
            item_description: concept,
            item_quantity: 1,
            item_unit_price: fee,
            item_total_price: fee,
            item_tax_rate: tax_rate,
            item_tax_amount: tax_amount,
            item_total_with_tax: total_with_tax,
          },
        ],
      },
      tenantId,
      paymentResult.data.paymentId,
    );

    const invoiceEmailRecipient = isDirectBailiffPath
      ? caseTransfer.bailiff?.email
      : caseTransfer.lawyer?.email;
    if (invoiceEmailRecipient) {
      await sendInvoiceEmail(invoiceEmailRecipient, invoice.id, false);
    }

    if (hasVerdict) {
      await CaseTransferService.uploadDocument({
        caseTransferId: caseTransfer.id,
        tenantId,
        uploadedById: actorUserId,
        fileName: params.verdictFileName!,
        mimeType: params.verdictMimeType!,
        size: params.verdictSize!,
        buffer: params.verdictBuffer!,
        category: "SENTENCIA",
      });
    }

    await prisma.lawyerFeeInvoice.create({
      data: {
        caseTransferId: caseTransfer.id,
        totalAmount: params.totalAmount,
        outcome: params.outcome,
        hasVerdict: params.outcome === "GERECHTELIJK" ? params.hasVerdict : null,
        completionDate: params.completionDate,
        verdictNumber: hasVerdict ? params.verdictNumber : null,
        verdictDate: hasVerdict ? params.verdictDate : null,
        selectedBailiffId: hasVerdict ? params.bailiffId : null,
        storageKey,
        originalName: params.fileName,
        mimeType: params.mimeType,
        size: params.size,
        cfsbFeeAmount: fee,
        taxAmount: tax_amount,
        paymentId: paymentResult.data.paymentId,
      },
    });

    await ClaimTimelineService.logEvent(
      caseTransfer.debtClaimId,
      "STATUS_CHANGED",
      isDirectBailiffPath
        ? `De deurwaarder registreerde de uitkomst en zijn kostenfactuur (${formatAmount(params.totalAmount)}). CFSB-commissie van ${formatAmount(total_with_tax)} in behandeling.`
        : `De advocaat registreerde zijn honorariumfactuur (${formatAmount(params.totalAmount)}). CFSB-commissie van ${formatAmount(total_with_tax)} in behandeling.`,
      { totalAmount: params.totalAmount, cfsbFee: total_with_tax },
      actorUserId,
    );

    return { paymentId: paymentResult.data.paymentId, paymentUrl: paymentResult.data.paymentUrl };
  };

  // Se llama desde el webhook de Sentoo cuando el Payment GOP_LAWYER_FEE o
  // GOP_BAILIFF_OUTCOME_FEE se confirma como pagado.
  static processLawyerFeePaymentConfirmed = async (paymentId: string) => {
    const lawyerFeeInvoice = await prisma.lawyerFeeInvoice.findUnique({
      where: { paymentId },
      include: {
        caseTransfer: { include: { debtClaim: true, lawyer: true, bailiff: true } },
        selectedBailiff: true,
      },
    });
    if (!lawyerFeeInvoice || lawyerFeeInvoice.status === "PAID" || !lawyerFeeInvoice.caseTransfer) return;

    await prisma.lawyerFeeInvoice.update({
      where: { id: lawyerFeeInvoice.id },
      data: { status: "PAID", paidAt: new Date() },
    });

    const billingInvoice = await prisma.billingInvoice.update({
      where: { payment_id: paymentId },
      data: { status: "paid" },
    });

    const caseTransfer = lawyerFeeInvoice.caseTransfer;
    // selectedBailiff solo existe en la ruta abogado-con-vonnis (a quién se
    // transfiere); en la ruta directa el alguacil ya es caseTransfer.bailiff.
    const bailiff = lawyerFeeInvoice.selectedBailiff;
    const isDirectBailiffPath = !caseTransfer.lawyer;

    // Factuur van CFSB (betaald) naar de advocaat, of naar de deurwaarder in
    // de rechtstreekse route — bevestiging dat de Sentoo-betaling van de
    // CFSB-vergoeding is verwerkt.
    const paidInvoiceEmailRecipient = isDirectBailiffPath
      ? caseTransfer.bailiff?.email
      : caseTransfer.lawyer?.email;
    if (paidInvoiceEmailRecipient) {
      await sendInvoiceEmail(paidInvoiceEmailRecipient, billingInvoice.id, true);
    }
    await prisma.caseTransfer.update({
      where: { id: caseTransfer.id },
      data: {
        workCompletedAt: new Date(),
        status: "WORK_COMPLETED",
        // De tijdens "Dossier afronden" geselecteerde deurwaarder wordt pas nu
        // effectief gekoppeld — nooit vóór de betaling van de CFSB-vergoeding.
        // In de rechtstreekse route is er geen selectedBailiff: de deurwaarder
        // was al toegewezen, dus deze spread is dan een no-op.
        ...(bailiff ? { bailiffId: bailiff.id } : {}),
      },
    });

    await ClaimTimelineService.logEvent(
      caseTransfer.debtClaimId,
      "STATUS_CHANGED",
      isDirectBailiffPath
        ? "De deurwaarder heeft deze route afgerond zonder vonnis: kostenfactuur en CFSB-commissie betaald. Er ontstaat geen GOP."
        : "De advocaat heeft zijn werk afgerond: honorariumfactuur en CFSB-commissie betaald.",
    );

    if (isDirectBailiffPath) {
      if (caseTransfer.bailiff?.user_id) {
        await NotificationService.create({
          tenant_id: caseTransfer.debtClaim.tenantId,
          user_id: caseTransfer.bailiff.user_id,
          type: NotificationType.GOP_BAILIFF_WORK_FINALIZED,
          title: "Uitkomst afgerond",
          message: `De betaling van de CFSB-commissie voor dossier ${caseTransfer.debtClaim.reference} werd bevestigd. Deze route is afgesloten — er is geen GOP.`,
          link: `/legal-processes/transfers/${caseTransfer.id}`,
          entity_type: "CaseTransfer",
          entity_id: caseTransfer.id,
        });
      }

      await NotificationService.notifyTenantStaff(caseTransfer.debtClaim.tenantId, {
        type: NotificationType.GOP_BAILIFF_WORK_FINALIZED,
        title: "Dossier afgerond zonder vonnis",
        message: `De deurwaarder heeft dossier ${caseTransfer.debtClaim.reference} afgerond zonder vonnis en de CFSB-vergoeding betaald.`,
        link: `/legal-processes/transfers/${caseTransfer.id}`,
        entity_type: "CaseTransfer",
        entity_id: caseTransfer.id,
      });

      return;
    }

    if (caseTransfer.lawyer?.userId) {
      await NotificationService.create({
        tenant_id: caseTransfer.debtClaim.tenantId,
        user_id: caseTransfer.lawyer.userId,
        type: NotificationType.GOP_LAWYER_WORK_FINALIZED,
        title: "Werk afgerond",
        message: bailiff
          ? `De betaling van de CFSB-commissie voor dossier ${caseTransfer.debtClaim.reference} werd bevestigd. Het vonnis is overgedragen aan deurwaarder ${bailiff.fullname}.`
          : `De betaling van de CFSB-commissie voor dossier ${caseTransfer.debtClaim.reference} werd bevestigd.`,
        link: `/legal-processes/transfers/${caseTransfer.id}`,
        entity_type: "CaseTransfer",
        entity_id: caseTransfer.id,
      });
    }

    await NotificationService.notifyTenantStaff(caseTransfer.debtClaim.tenantId, {
      type: NotificationType.GOP_LAWYER_WORK_FINALIZED,
      title: "Advocatenfase afgerond",
      message: `De advocaat heeft dossier ${caseTransfer.debtClaim.reference} afgerond en de CFSB-vergoeding betaald.`,
      link: `/legal-processes/transfers/${caseTransfer.id}`,
      entity_type: "CaseTransfer",
      entity_id: caseTransfer.id,
    });

    // Het vonnis wordt, zoals gevraagd ("Daarna wordt het vonnis via CFSB
    // beschikbaar gesteld aan die deurwaarder"), automatisch en zonder extra
    // handeling van de advocaat overgedragen aan de tijdens "Dossier
    // afronden" geselecteerde deurwaarder.
    if (bailiff) {
      await ClaimTimelineService.logEvent(
        caseTransfer.debtClaimId,
        "BAILIFF_ASSIGNED",
        `Het vonnis werd overgedragen aan deurwaarder ${bailiff.fullname} voor executie.`,
        { bailiffId: bailiff.id },
      );

      if (bailiff.user_id) {
        await NotificationService.create({
          tenant_id: caseTransfer.debtClaim.tenantId,
          user_id: bailiff.user_id,
          type: NotificationType.GOP_TRANSFERRED_TO_BAILIFF,
          title: "Nieuw dossier voor executie",
          message: `Dossier ${caseTransfer.debtClaim.reference} werd aan je overgedragen voor executie.`,
          link: `/legal-processes/transfers/${caseTransfer.id}`,
          entity_type: "CaseTransfer",
          entity_id: caseTransfer.id,
        });
      }
    }
  };

  // Mientras la comisión CFSB (LawyerFeeInvoice) siga PENDING_PAYMENT, el
  // abogado — o, en la ruta directa, el alguacil — recibe una herinnering
  // cada ~30 días — además del bloqueo inmediato que ya aplica cada vez que
  // intenta aceptar una nueva overdracht (ver acceptTransfer). Llamado por
  // el job programado check_lawyer_fee_payment_reminders.
  static sendLawyerFeePaymentReminders = async () => {
    const REMINDER_INTERVAL_DAYS = 30;
    const now = new Date();
    const cutoff = addDays(now, -REMINDER_INTERVAL_DAYS);

    const pendingInvoices = await prisma.lawyerFeeInvoice.findMany({
      where: { status: "PENDING_PAYMENT" },
      include: { caseTransfer: { include: { debtClaim: true, lawyer: true, bailiff: true } } },
    });

    let reminders = 0;
    for (const invoice of pendingInvoices) {
      const caseTransfer = invoice.caseTransfer;
      const recipientUserId = caseTransfer?.lawyer?.userId ?? caseTransfer?.bailiff?.user_id;
      if (!caseTransfer || !recipientUserId) continue;

      const lastReminder = await prisma.notification.findFirst({
        where: {
          entity_type: "CaseTransfer",
          entity_id: caseTransfer.id,
          type: "CASE_TRANSFER_LAWYER_FEE_PAYMENT_REMINDER",
        },
        orderBy: { created_at: "desc" },
      });

      const lastEventAt = lastReminder?.created_at ?? invoice.createdAt;
      if (lastEventAt > cutoff) continue;

      await NotificationService.create({
        tenant_id: caseTransfer.debtClaim.tenantId,
        user_id: recipientUserId,
        type: NotificationType.CASE_TRANSFER_LAWYER_FEE_PAYMENT_REMINDER,
        title: "Herinnering: openstaande CFSB-vergoeding",
        message: `U heeft nog een openstaande CFSB-vergoeding voor dossier ${
          caseTransfer.debtClaim.reference ?? caseTransfer.debtClaimId
        }. Zolang deze niet betaald is, kunt u geen nieuwe dossieroverdrachten accepteren.`,
        link: `/legal-processes/transfers/${caseTransfer.id}`,
        entity_type: "CaseTransfer",
        entity_id: caseTransfer.id,
      });
      reminders++;
    }

    return { reminders };
  };

  // ---------------------------------------------------------------------
  // Documentos de la fase de transferencia
  // ---------------------------------------------------------------------

  static uploadDocument = async (params: {
    caseTransferId: string;
    tenantId: string;
    uploadedById?: string;
    fileName: string;
    mimeType: string;
    size: number;
    buffer: Buffer;
    category?: string;
  }) => {
    const sanitizedName = `${crypto.randomUUID()}-${params.fileName}`.replace(/\s+/g, "-");
    const folder = `${params.tenantId}/case-transfers/${params.caseTransferId}`;
    const storageKey = await StorageService.uploadFile(
      folder,
      sanitizedName,
      params.mimeType,
      params.buffer,
    );

    return prisma.caseTransferDocument.create({
      data: {
        caseTransferId: params.caseTransferId,
        fileName: sanitizedName,
        originalName: params.fileName,
        mimeType: params.mimeType,
        size: params.size,
        storageKey,
        category: params.category,
        uploadedById: params.uploadedById,
      },
    });
  };

  static getDocuments = async (caseTransferId: string) => {
    return prisma.caseTransferDocument.findMany({
      where: { caseTransferId },
      orderBy: { createdAt: "desc" },
    });
  };

  static getDocumentById = async (documentId: string) => {
    return prisma.caseTransferDocument.findUnique({ where: { id: documentId } });
  };

  static deleteDocument = async (documentId: string) => {
    const document = await prisma.caseTransferDocument.findUnique({ where: { id: documentId } });
    if (!document) throw new Error("Document niet gevonden");

    await StorageService.removeDocument(document.storageKey);
    await prisma.caseTransferDocument.delete({ where: { id: documentId } });
  };
}
