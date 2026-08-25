import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { addDays, startOfDay } from "date-fns";
import {
  TransferToLawyerInput,
  SubmitLawyerFeeInvoiceInput,
  AssignBailiffForExecutionInput,
} from "@/modules/legal-process/services/case-transfer.validators";
import { DEFAULT_GOP_FEE_RATE_PERCENT } from "@/modules/legal-process/constants/legal-process-status";
import { ClaimTimelineService } from "@/modules/collection/services/claim-timeline.service";
import { ObligationService } from "@/modules/collection/services/obligation.service";
import { NotificationService } from "@/modules/notification/services/notification.service";
import { NotificationType } from "@/modules/notification/constants/notification-type";
import { BillingInvoiceService } from "@/modules/payment/services/billing-invoice.service";
import { sendInvoiceEmail } from "@/modules/payment/services/payment-mail.service";
import { PaymentService } from "@/modules/payment/services/payment.service";
import { PaymentType } from "@/modules/payment/services/payment.validators";
import { ParameterService } from "@/modules/settings/services/parameter/parameter.service";
import { SettingsService } from "@/modules/settings/services/settings/settings.service";
import { StorageService } from "@/infrastructure/storage/storage.service";

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

  static getForLawyerUser = async (userId: string) => {
    const items = await prisma.caseTransfer.findMany({
      where: { lawyer: { userId } },
      include: caseTransferInclude,
      orderBy: { createdAt: "desc" },
    });
    return items.map(serializeCaseTransfer);
  };

  static getForBailiffUser = async (userId: string) => {
    const items = await prisma.caseTransfer.findMany({
      where: { bailiff: { user_id: userId } },
      include: caseTransferInclude,
      orderBy: { createdAt: "desc" },
    });
    return items.map(serializeCaseTransfer);
  };

  static getAllForTenant = async (tenantId: string) => {
    const items = await prisma.caseTransfer.findMany({
      where: { debtClaim: { tenantId } },
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
  // Solicitud de transferencia y pago de la comisión (5%)
  // ---------------------------------------------------------------------

  // La transferencia solo queda notificada al abogado/alguacil después de
  // que el participante paga la comisión CFSB (5% del saldo pendiente): el
  // dossier se crea en PENDING_PAYMENT, genera Payment+BillingInvoice, y
  // recién al confirmarse el pago (confirmTransferPayment, vía webhook de
  // Sentoo) pasa a PENDING_ACCEPTANCE y se notifica.
  static requestTransfer = async (input: TransferToLawyerInput, actorUserId: string) => {
    const debtClaim = await prisma.debtClaim.findUnique({ where: { id: input.debtClaimId } });
    if (!debtClaim) throw new Error("Dossier (DebtClaim) niet gevonden");

    // El GOP es el último escalón: se habilita cuando la fase del AOP llegó
    // a BLK_NOTIFICATION ("Blokkade"), O cuando ya existe una Blokkade
    // ACTIVE para este dossier (p.ej. originada directamente, o vía un COP
    // que nunca pasó por el flujo AOP).
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

    if (input.lawyerId) {
      const lawyer = await prisma.lawyer.findUnique({ where: { id: input.lawyerId } });
      if (!lawyer) throw new Error("Advocaat niet gevonden");
    } else if (input.bailiffId) {
      const bailiff = await prisma.bailiff.findUnique({ where: { id: input.bailiffId } });
      if (!bailiff) throw new Error("Deurwaarder niet gevonden");
    } else {
      throw new Error("Selecteer een advocaat of een deurwaarder.");
    }

    // Si ya existe una transferencia aceptada/en curso para este dossier y
    // esta parte, no hay nada más que pagar — devolver tal cual.
    const existingAccepted = await prisma.caseTransfer.findFirst({
      where: {
        debtClaimId: input.debtClaimId,
        lawyerId: input.lawyerId ?? null,
        bailiffId: input.bailiffId ?? null,
        status: { in: ["PENDING_ACCEPTANCE", "ACCEPTED", "WORK_COMPLETED"] },
      },
    });
    if (existingAccepted) return { caseTransferId: existingAccepted.id };

    // Si ya existe una transferencia esperando pago para este dossier y esta
    // parte, reusar ese link de pago en vez de generar uno nuevo.
    const existingPending = await prisma.caseTransfer.findFirst({
      where: {
        debtClaimId: input.debtClaimId,
        lawyerId: input.lawyerId ?? null,
        bailiffId: input.bailiffId ?? null,
        status: "PENDING_PAYMENT",
      },
      include: { payment: true },
    });
    if (existingPending?.payment && existingPending.payment.status === "pending" && existingPending.payment.payment_url) {
      return {
        caseTransferId: existingPending.id,
        paymentId: existingPending.paymentId!,
        paymentUrl: existingPending.payment.payment_url,
      };
    }

    const tenant = await prisma.tenant.findUnique({ where: { id: debtClaim.tenantId } });
    if (!tenant) throw new Error("Tenant not found");

    const obligation = await ObligationService.ensurePrincipalDebtObligation(
      input.debtClaimId,
      Number(debtClaim.principalAmount),
    );

    const parameter = await ParameterService.getParameterForTenant(debtClaim.tenantId);
    const gopFeePercent = await SettingsService.resolveNumber(
      "gop_fee_rate",
      { tenantId: debtClaim.tenantId, jurisdictionId: tenant.jurisdictionId },
      DEFAULT_GOP_FEE_RATE_PERCENT,
    );
    const fee = Math.round(Number(obligation.balanceAmount) * (gopFeePercent / 100) * 100) / 100;
    const tax_rate = parameter?.abb_rate ?? 0;
    const tax_amount = Math.round(((fee * tax_rate) / 100) * 100) / 100;
    const total_with_tax = fee + tax_amount;

    const concept = `CFSB-overdrachtscommissie (5%) — dossier ${debtClaim.reference ?? debtClaim.id}`;

    const paymentResult = await PaymentService.create(debtClaim.tenantId, {
      amount: total_with_tax,
      currency: "USD",
      description: concept,
      reference: `gop_transfer_${input.debtClaimId}_${Date.now()}`,
      payment_type: PaymentType.GOP_TRANSFER,
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
        tenant_id: debtClaim.tenantId,
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
      debtClaim.tenantId,
      paymentResult.data.paymentId,
    );
    if (tenant.contact_email) {
      await sendInvoiceEmail(tenant.contact_email, invoice.id, false);
    }

    const caseTransfer = await prisma.caseTransfer.create({
      data: {
        debtClaimId: input.debtClaimId,
        lawyerId: input.lawyerId ?? null,
        bailiffId: input.bailiffId ?? null,
        status: "PENDING_PAYMENT",
        paymentId: paymentResult.data.paymentId,
        isEmergencyTransfer: input.isEmergencyTransfer ?? false,
        emergencyReason: input.isEmergencyTransfer ? input.emergencyReason : null,
      },
    });

    await ClaimTimelineService.logEvent(
      caseTransfer.debtClaimId,
      "STATUS_CHANGED",
      `Overdracht van het dossier aangevraagd. In afwachting van de betaling van de CFSB-commissie (${total_with_tax}).`,
      { lawyerId: caseTransfer.lawyerId, bailiffId: caseTransfer.bailiffId },
      actorUserId,
    );

    return {
      caseTransferId: caseTransfer.id,
      paymentId: paymentResult.data.paymentId,
      paymentUrl: paymentResult.data.paymentUrl,
    };
  };

  // Se llama desde el webhook de Sentoo (vía payment-processor) cuando un
  // Payment de tipo GOP_TRANSFER se confirma como pagado: recién ahí la
  // transferencia queda notificada al abogado/alguacil, sin GOP alguno
  // (GOP solo nace al registrar la sentencia, ver LegalProcessService).
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

    const acceptedByLawyer = !!caseTransfer.lawyerId;

    const updated = await prisma.caseTransfer.update({
      where: { id: caseTransferId },
      data: { status: "ACCEPTED", respondedAt: new Date() },
    });

    await ClaimTimelineService.logEvent(
      caseTransfer.debtClaimId,
      acceptedByLawyer ? "LAWYER_ASSIGNED" : "BAILIFF_ASSIGNED",
      `De ${acceptedByLawyer ? "advocaat" : "deurwaarder"} heeft het dossier geaccepteerd. Gerechtelijke procedure gestart.`,
      undefined,
      actorUserId,
    );

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

    await NotificationService.notifyTenantStaff(caseTransfer.debtClaim.tenantId, {
      type: NotificationType.LEGAL_PROCESS_REJECTED,
      title: "Dossier afgewezen",
      message: `De ${rejectedByLawyer ? "advocaat" : "deurwaarder"} heeft dossier ${caseTransfer.debtClaim.reference} afgewezen: ${reason}. Selecteer een andere advocaat of deurwaarder.`,
      link: `/legal-processes/transfers/${updated.id}`,
      entity_type: "CaseTransfer",
      entity_id: updated.id,
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
    },
    actorUserId?: string,
  ) => {
    const caseTransfer = await prisma.caseTransfer.findUnique({
      where: { id: params.caseTransferId },
      include: { debtClaim: true, lawyer: true },
    });
    if (!caseTransfer) throw new Error("Dossier niet gevonden");
    if (!caseTransfer.lawyer) throw new Error("Dit dossier heeft geen toegewezen advocaat.");
    if (caseTransfer.status !== "ACCEPTED") {
      throw new Error(`Kan geen honorariumfactuur registreren in de status ${caseTransfer.status}.`);
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

    const concept = `CFSB-commissie (5%) op advocaatkosten — dossier ${
      caseTransfer.debtClaim.reference ?? caseTransfer.debtClaimId
    }`;

    const paymentResult = await PaymentService.create(tenantId, {
      amount: total_with_tax,
      currency: "USD",
      description: concept,
      reference: `gop_lawyer_fee_${caseTransfer.id}_${Date.now()}`,
      payment_type: PaymentType.GOP_LAWYER_FEE,
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

    if (caseTransfer.lawyer.email) {
      await sendInvoiceEmail(caseTransfer.lawyer.email, invoice.id, false);
    }

    await prisma.lawyerFeeInvoice.create({
      data: {
        caseTransferId: caseTransfer.id,
        totalAmount: params.totalAmount,
        invoiceNumber: params.invoiceNumber,
        invoiceDate: params.invoiceDate,
        storageKey,
        originalName: params.fileName,
        mimeType: params.mimeType,
        size: params.size,
        cfsbFeeAmount: fee,
        paymentId: paymentResult.data.paymentId,
      },
    });

    await ClaimTimelineService.logEvent(
      caseTransfer.debtClaimId,
      "STATUS_CHANGED",
      `De advocaat registreerde zijn honorariumfactuur (${params.totalAmount}). CFSB-commissie van ${total_with_tax} in behandeling.`,
      { totalAmount: params.totalAmount, cfsbFee: total_with_tax },
      actorUserId,
    );

    return { paymentId: paymentResult.data.paymentId, paymentUrl: paymentResult.data.paymentUrl };
  };

  // Se llama desde el webhook de Sentoo cuando el Payment GOP_LAWYER_FEE se
  // confirma como pagado.
  static processLawyerFeePaymentConfirmed = async (paymentId: string) => {
    const lawyerFeeInvoice = await prisma.lawyerFeeInvoice.findUnique({
      where: { paymentId },
      include: { caseTransfer: { include: { debtClaim: true, lawyer: true } } },
    });
    if (!lawyerFeeInvoice || lawyerFeeInvoice.status === "PAID" || !lawyerFeeInvoice.caseTransfer) return;

    await prisma.lawyerFeeInvoice.update({
      where: { id: lawyerFeeInvoice.id },
      data: { status: "PAID", paidAt: new Date() },
    });

    await prisma.billingInvoice.updateMany({
      where: { payment_id: paymentId },
      data: { status: "paid" },
    });

    const caseTransfer = lawyerFeeInvoice.caseTransfer;
    await prisma.caseTransfer.update({
      where: { id: caseTransfer.id },
      data: { workCompletedAt: new Date(), status: "WORK_COMPLETED" },
    });

    await ClaimTimelineService.logEvent(
      caseTransfer.debtClaimId,
      "STATUS_CHANGED",
      "De advocaat heeft zijn werk afgerond: honorariumfactuur en CFSB-commissie betaald.",
    );

    if (caseTransfer.lawyer?.userId) {
      await NotificationService.create({
        tenant_id: caseTransfer.debtClaim.tenantId,
        user_id: caseTransfer.lawyer.userId,
        type: NotificationType.GOP_LAWYER_WORK_FINALIZED,
        title: "Werk afgerond",
        message: `De betaling van de CFSB-commissie voor dossier ${caseTransfer.debtClaim.reference} werd bevestigd. Het vonnis kan nu overgedragen worden aan de deurwaarder.`,
        link: `/legal-processes/transfers/${caseTransfer.id}`,
        entity_type: "CaseTransfer",
        entity_id: caseTransfer.id,
      });
    }
  };

  // El abogado entrega el expediente al alguacil que va a registrar el
  // vonnis. Requiere trabajo finalizado (honorarios + comisión CFSB pagada)
  // y el documento del Vonnis ya adjunto.
  static assignBailiffForExecution = async (
    data: AssignBailiffForExecutionInput,
    actorUserId?: string,
  ) => {
    const caseTransfer = await prisma.caseTransfer.findUnique({
      where: { id: data.caseTransferId },
      include: { debtClaim: true, lawyer: true },
    });
    if (!caseTransfer) throw new Error("Dossier niet gevonden");

    if (!caseTransfer.workCompletedAt) {
      throw new Error(
        "U dient eerst uw werk af te ronden (honorariumfactuur en betaling van de CFSB-commissie) voordat u het dossier kunt overdragen.",
      );
    }

    const vonnisDocument = await prisma.caseTransferDocument.findFirst({
      where: { caseTransferId: caseTransfer.id, category: "SENTENCIA" },
    });
    if (!vonnisDocument) {
      throw new Error(
        "U dient het vonnisdocument bij te voegen voordat u het dossier kunt overdragen aan de deurwaarder.",
      );
    }

    const bailiff = await prisma.bailiff.findUnique({ where: { id: data.bailiffId } });
    if (!bailiff) throw new Error("Deurwaarder niet gevonden");

    const updated = await prisma.caseTransfer.update({
      where: { id: caseTransfer.id },
      data: { bailiffId: data.bailiffId },
    });

    await ClaimTimelineService.logEvent(
      caseTransfer.debtClaimId,
      "BAILIFF_ASSIGNED",
      `De advocaat heeft het vonnis overgedragen aan deurwaarder ${bailiff.fullname} voor executie.`,
      { bailiffId: data.bailiffId },
      actorUserId,
    );

    if (bailiff.user_id) {
      await NotificationService.create({
        tenant_id: caseTransfer.debtClaim.tenantId,
        user_id: bailiff.user_id,
        type: NotificationType.GOP_TRANSFERRED_TO_BAILIFF,
        title: "Nieuw dossier voor executie",
        message: `Dossier ${caseTransfer.debtClaim.reference} werd aan je overgedragen voor executie.`,
        link: `/legal-processes/transfers/${updated.id}`,
        entity_type: "CaseTransfer",
        entity_id: updated.id,
      });
    }

    return updated;
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
