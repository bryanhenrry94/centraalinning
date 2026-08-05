import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import {
  TransferToLawyerInput,
  SubmitLawyerFeeInvoiceInput,
  AssignBailiffForExecutionInput,
} from "@/modules/legal-process/services/case-transfer.validators";
import { GOP_FEE_RATE } from "@/modules/legal-process/constants/legal-process-status";
import { ClaimTimelineService } from "@/modules/collection/services/claim-timeline.service";
import { ObligationService } from "@/modules/collection/services/obligation.service";
import { DebtFineService } from "@/modules/collection/services/debt-fine.service";
import { NotificationService } from "@/modules/notification/services/notification.service";
import { NotificationType } from "@/modules/notification/constants/notification-type";
import { BillingInvoiceService } from "@/modules/payment/services/billing-invoice.service";
import { sendInvoiceEmail } from "@/modules/payment/services/payment-mail.service";
import { PaymentService } from "@/modules/payment/services/payment.service";
import { PaymentType } from "@/modules/payment/services/payment.validators";
import { ParameterService } from "@/modules/settings/services/parameter/parameter.service";
import { StorageService } from "@/infrastructure/storage/storage.service";

const ACCEPTANCE_WINDOW_DAYS = 7;

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

  // ---------------------------------------------------------------------
  // Solicitud de transferencia y pago de la comisión (5%)
  // ---------------------------------------------------------------------

  static requestTransfer = async (input: TransferToLawyerInput, actorUserId: string) => {
    const debtClaim = await prisma.debtClaim.findUnique({ where: { id: input.debtClaimId } });
    if (!debtClaim) throw new Error("Expediente (DebtClaim) no encontrado");

    // El GOP es el último escalón: solo se habilita cuando la fase del AOP
    // de este expediente llegó a BLK_NOTIFICATION ("Blokkade").
    const aop = await prisma.administrativeCollection.findUnique({
      where: { debtClaimId: input.debtClaimId },
      include: { steps: { orderBy: { id: "desc" }, take: 1 } },
    });
    if (aop?.steps[0]?.step !== "BLK_NOTIFICATION") {
      throw new Error(
        "Het dossier kan alleen worden overgedragen aan gerechtelijke opvolging als de AOP-fase Blokkade is.",
      );
    }

    if (input.lawyerId) {
      const lawyer = await prisma.lawyer.findUnique({ where: { id: input.lawyerId } });
      if (!lawyer) throw new Error("Abogado no encontrado");
    } else if (input.bailiffId) {
      const bailiff = await prisma.bailiff.findUnique({ where: { id: input.bailiffId } });
      if (!bailiff) throw new Error("Alguacil no encontrado");
    } else {
      throw new Error("Selecteer een advocaat of een deurwaarder.");
    }

    // Si ya hay un cobro pendiente para este dossier y esta parte, reusar
    // ese pago en vez de cobrar dos veces.
    const existing = await prisma.caseTransfer.findFirst({
      where: {
        debtClaimId: input.debtClaimId,
        lawyerId: input.lawyerId ?? null,
        bailiffId: input.bailiffId ?? null,
        status: "PENDING_PAYMENT",
      },
      include: { payment: true },
    });
    if (existing?.payment && existing.payment.status === "pending" && existing.payment.payment_url) {
      return { paymentId: existing.paymentId!, paymentUrl: existing.payment.payment_url };
    }

    const obligation = await ObligationService.ensurePrincipalDebtObligation(
      input.debtClaimId,
      Number(debtClaim.principalAmount),
    );
    const fee = Math.round(Number(obligation.balanceAmount) * GOP_FEE_RATE * 100) / 100;

    const paymentResult = await PaymentService.create(debtClaim.tenantId, {
      amount: fee,
      currency: "USD",
      description: `GOP-transfercommissie (5%) — dossier ${debtClaim.reference ?? debtClaim.id}`,
      payment_type: PaymentType.GOP_TRANSFER,
    });
    if (!paymentResult.success || !paymentResult.data) {
      throw new Error(
        paymentResult.message || "Kon geen betaling aanmaken voor de GOP-overdracht.",
      );
    }

    await prisma.caseTransfer.create({
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

    return { paymentId: paymentResult.data.paymentId, paymentUrl: paymentResult.data.paymentUrl };
  };

  // Se llama desde el webhook de Sentoo cuando el Payment GOP_TRANSFER se
  // confirma como pagado — recién ahí se notifica al abogado/alguacil.
  static confirmTransferPayment = async (paymentId: string) => {
    const caseTransfer = await prisma.caseTransfer.findUnique({
      where: { paymentId },
      include: { debtClaim: true, lawyer: true, bailiff: true },
    });
    if (!caseTransfer || caseTransfer.status !== "PENDING_PAYMENT") return;

    const updated = await prisma.caseTransfer.update({
      where: { id: caseTransfer.id },
      data: {
        status: "PENDING_ACCEPTANCE",
        acceptanceDeadline: new Date(Date.now() + ACCEPTANCE_WINDOW_DAYS * 24 * 60 * 60 * 1000),
      },
    });

    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (payment) {
      await DebtFineService.applyCharge(
        caseTransfer.debtClaimId,
        Number(payment.total_amount),
        "GOP-transfercommissie (5%)",
        "GOP",
      );
    }

    const assignedLabel = caseTransfer.lawyer
      ? `advocaat ${caseTransfer.lawyer.firstName} ${caseTransfer.lawyer.lastName}`
      : `deurwaarder ${caseTransfer.bailiff!.fullname}`;
    const emergencyPrefix = caseTransfer.isEmergencyTransfer ? "[NOODOVERDRACHT] " : "";

    await ClaimTimelineService.logEvent(
      caseTransfer.debtClaimId,
      "GOP_STARTED",
      `${emergencyPrefix}Dossier overgedragen aan ${assignedLabel}${
        caseTransfer.isEmergencyTransfer ? ` — reden: ${caseTransfer.emergencyReason}` : ""
      }`,
      { lawyerId: caseTransfer.lawyerId, bailiffId: caseTransfer.bailiffId },
    );

    const assignedUserId = caseTransfer.lawyer?.userId ?? caseTransfer.bailiff?.user_id;
    if (assignedUserId) {
      await NotificationService.create({
        tenant_id: caseTransfer.debtClaim.tenantId,
        user_id: assignedUserId,
        type: NotificationType.LEGAL_PROCESS_TRANSFER_REQUEST,
        title: caseTransfer.isEmergencyTransfer
          ? "Nuevo expediente urgente para seguimiento judicial"
          : "Nuevo expediente para seguimiento judicial",
        message: caseTransfer.isEmergencyTransfer
          ? `Se te transfirió con carácter urgente (noodoverdracht) el expediente ${caseTransfer.debtClaim.reference}: ${caseTransfer.emergencyReason}`
          : `Se te transfirió el expediente ${caseTransfer.debtClaim.reference} para su seguimiento judicial.`,
        link: `/legal-processes/transfers/${updated.id}`,
        entity_type: "CaseTransfer",
        entity_id: updated.id,
      });
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
    if (!caseTransfer) throw new Error("Expediente no encontrado");
    if (caseTransfer.status !== "PENDING_ACCEPTANCE") {
      throw new Error("El expediente no está pendiente de aceptación");
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
        title: "Expediente aceptado",
        message: `El ${acceptedByLawyer ? "abogado" : "alguacil"} aceptó el expediente ${caseTransfer.debtClaim.reference}.`,
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
    if (!caseTransfer) throw new Error("Expediente no encontrado");
    if (caseTransfer.status !== "PENDING_ACCEPTANCE") {
      throw new Error("El expediente no está pendiente de aceptación");
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
      title: "Expediente rechazado",
      message: `El ${rejectedByLawyer ? "abogado" : "alguacil"} rechazó el expediente ${caseTransfer.debtClaim.reference}: ${reason}. Selecciona otro abogado o alguacil.`,
      link: `/legal-processes/transfers/${updated.id}`,
      entity_type: "CaseTransfer",
      entity_id: updated.id,
    });

    return updated;
  };

  // ---------------------------------------------------------------------
  // Vencimiento automático del plazo de aceptación (AT-012/AT-013: 7 días)
  // ---------------------------------------------------------------------

  // Llamado por el job programado check_case_transfer_deadlines. A
  // diferencia de rejectTransfer (rechazo activo del abogado/alguacil), acá
  // no hay actorUserId — es el sistema el que expira el plazo — por eso
  // también se notifica a la parte asignada, que de otro modo no se
  // enteraría de que perdió el expediente por falta de respuesta.
  static expireOverdueTransfers = async () => {
    const overdue = await prisma.caseTransfer.findMany({
      where: { status: "PENDING_ACCEPTANCE", acceptanceDeadline: { lt: new Date() } },
      include: { debtClaim: true, lawyer: true, bailiff: true },
    });

    for (const caseTransfer of overdue) {
      const assignedLabel = caseTransfer.lawyer
        ? `advocaat ${caseTransfer.lawyer.firstName} ${caseTransfer.lawyer.lastName}`
        : `deurwaarder ${caseTransfer.bailiff!.fullname}`;
      const reason = `Automatisch afgewezen: geen reactie binnen de acceptatietermijn van ${ACCEPTANCE_WINDOW_DAYS} dagen.`;

      const updated = await prisma.caseTransfer.update({
        where: { id: caseTransfer.id },
        data: { status: "REJECTED", rejectionReason: reason, respondedAt: new Date() },
      });

      await ClaimTimelineService.logEvent(
        caseTransfer.debtClaimId,
        "STATUS_CHANGED",
        `Overdracht automatisch afgewezen: ${assignedLabel} heeft niet binnen ${ACCEPTANCE_WINDOW_DAYS} dagen gereageerd.`,
      );

      await NotificationService.notifyTenantStaff(caseTransfer.debtClaim.tenantId, {
        type: NotificationType.LEGAL_PROCESS_REJECTED,
        title: "Expediente rechazado automáticamente",
        message: `El plazo de aceptación del expediente ${caseTransfer.debtClaim.reference} venció sin respuesta del ${assignedLabel}. Selecciona otro abogado o alguacil.`,
        link: `/legal-processes/transfers/${updated.id}`,
        entity_type: "CaseTransfer",
        entity_id: updated.id,
      });

      const assignedUserId = caseTransfer.lawyer?.userId ?? caseTransfer.bailiff?.user_id;
      if (assignedUserId) {
        await NotificationService.create({
          tenant_id: caseTransfer.debtClaim.tenantId,
          user_id: assignedUserId,
          type: NotificationType.LEGAL_PROCESS_REJECTED,
          title: "Plazo de aceptación vencido",
          message: `No respondiste a tiempo la solicitud de transferencia del expediente ${caseTransfer.debtClaim.reference}; fue rechazada automáticamente.`,
          link: `/legal-processes/transfers/${updated.id}`,
          entity_type: "CaseTransfer",
          entity_id: updated.id,
        });
      }
    }

    return overdue.length;
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
      `GOP geannuleerd door de deelnemer: ${reason}`,
      undefined,
      actorUserId,
    );

    await NotificationService.notifyTenantStaff(caseTransfer.debtClaim.tenantId, {
      type: NotificationType.GOP_CANCELLED,
      title: "GOP cancelado",
      message: `El expediente ${caseTransfer.debtClaim.reference} fue cancelado: ${reason}`,
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
        title: "GOP cancelado",
        message: `El participante canceló la gestión judicial del expediente ${caseTransfer.debtClaim.reference}.`,
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
    if (!caseTransfer) throw new Error("Expediente no encontrado");
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

    const parameter = await ParameterService.getParameter();
    const fee = Math.round(params.totalAmount * GOP_FEE_RATE * 100) / 100;
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
        title: "Trabajo finalizado",
        message: `Se confirmó el pago de la comisión CFSB del expediente ${caseTransfer.debtClaim.reference}. Ya puede transferir la sentencia al agente judicial.`,
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
    if (!caseTransfer) throw new Error("Expediente no encontrado");

    if (!caseTransfer.workCompletedAt) {
      throw new Error(
        "Debe finalizar su trabajo (factura de honorarios y pago de la comisión CFSB) antes de transferir el expediente.",
      );
    }

    const vonnisDocument = await prisma.caseTransferDocument.findFirst({
      where: { caseTransferId: caseTransfer.id, category: "SENTENCIA" },
    });
    if (!vonnisDocument) {
      throw new Error(
        "Debe adjuntar el documento del Vonnis antes de transferir el expediente al agente judicial.",
      );
    }

    const bailiff = await prisma.bailiff.findUnique({ where: { id: data.bailiffId } });
    if (!bailiff) throw new Error("Alguacil no encontrado");

    const updated = await prisma.caseTransfer.update({
      where: { id: caseTransfer.id },
      data: { bailiffId: data.bailiffId },
    });

    await ClaimTimelineService.logEvent(
      caseTransfer.debtClaimId,
      "BAILIFF_ASSIGNED",
      `El abogado transfirió la sentencia al alguacil ${bailiff.fullname} para su ejecución.`,
      { bailiffId: data.bailiffId },
      actorUserId,
    );

    if (bailiff.user_id) {
      await NotificationService.create({
        tenant_id: caseTransfer.debtClaim.tenantId,
        user_id: bailiff.user_id,
        type: NotificationType.GOP_TRANSFERRED_TO_BAILIFF,
        title: "Nuevo expediente para ejecución",
        message: `Se te transfirió el expediente ${caseTransfer.debtClaim.reference} para iniciar el GOP.`,
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
