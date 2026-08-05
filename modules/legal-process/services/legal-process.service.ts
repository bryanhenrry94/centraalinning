import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import {
  RegisterVerdictInput,
  RegisterExecutionMeasureInput,
  RegisterInterestUpdateInput,
  RegisterBailiffCostInput,
  MarkInactiveInput,
  ChangeBailiffInput,
  SubmitBailiffFeeInvoiceInput,
} from "@/modules/legal-process/services/legal-process.validators";
import {
  GOP_FEE_RATE,
  LegalProcessStatus,
  VERDICT_REGISTRABLE_STATUSES,
  GOP_OPERABLE_STATUSES,
} from "@/modules/legal-process/constants/legal-process-status";
import { CASE_TRANSFER_VERDICT_REGISTRABLE_STATUSES } from "@/modules/legal-process/constants/case-transfer-status";
import { ClaimTimelineService } from "@/modules/collection/services/claim-timeline.service";
import { ObligationService } from "@/modules/collection/services/obligation.service";
import { DebtFineService } from "@/modules/collection/services/debt-fine.service";
import { BlockadeService } from "@/modules/blockade/services/blockade.service";
import { NotificationService } from "@/modules/notification/services/notification.service";
import { NotificationType } from "@/modules/notification/constants/notification-type";
import { BillingInvoiceService } from "@/modules/payment/services/billing-invoice.service";
import { sendInvoiceEmail } from "@/modules/payment/services/payment-mail.service";
import { PaymentService } from "@/modules/payment/services/payment.service";
import { PaymentType } from "@/modules/payment/services/payment.validators";
import { ParameterService } from "@/modules/settings/services/parameter/parameter.service";
import { StorageService } from "@/infrastructure/storage/storage.service";

const legalProcessInclude = {
  debtClaim: { include: { debtor: { include: { person: true } }, tenant: true } },
  caseTransfer: { include: { lawyer: true } },
  bailiff: true,
  verdicts: true,
} satisfies Prisma.LegalProcessInclude;

type LegalProcessWithInclude = Prisma.LegalProcessGetPayload<{ include: typeof legalProcessInclude }>;

// Next.js no puede serializar instancias de Decimal al cruzar de una Server
// Action a un Client Component ("Only plain objects can be passed..."); acá
// se convierte a number antes de que la respuesta salga del servidor.
function serializeLegalProcess<T extends LegalProcessWithInclude>(legalProcess: T) {
  return {
    ...legalProcess,
    debtClaim: {
      ...legalProcess.debtClaim,
      principalAmount: Number(legalProcess.debtClaim.principalAmount),
    },
  };
}

export class LegalProcessService {
  static generateReferenceNumber = async () => {
    const year = new Date().getFullYear();
    const total = await prisma.legalProcess.count();
    return `GOP-${year}-${String(total + 1).padStart(3, "0")}`;
  };

  static getById = async (id: string) => {
    const legalProcess = await prisma.legalProcess.findUnique({
      where: { id },
      include: legalProcessInclude,
    });
    return legalProcess ? serializeLegalProcess(legalProcess) : null;
  };

  static getByDebtClaimId = async (debtClaimId: string) => {
    const legalProcess = await prisma.legalProcess.findUnique({
      where: { debtClaimId },
      include: legalProcessInclude,
    });
    return legalProcess ? serializeLegalProcess(legalProcess) : null;
  };

  static getForBailiffUser = async (userId: string) => {
    const legalProcesses = await prisma.legalProcess.findMany({
      where: { bailiff: { user_id: userId } },
      include: legalProcessInclude,
      orderBy: { startedAt: "desc" },
    });
    return legalProcesses.map(serializeLegalProcess);
  };

  static getAllForTenant = async (tenantId: string) => {
    const legalProcesses = await prisma.legalProcess.findMany({
      where: { debtClaim: { tenantId } },
      include: legalProcessInclude,
      orderBy: { startedAt: "desc" },
    });
    return legalProcesses.map(serializeLegalProcess);
  };

  // ---------------------------------------------------------------------
  // Registro de sentencia -> inicio automático del GOP
  // ---------------------------------------------------------------------

  // Si data.caseTransferId viene informado, este es el PRIMER vonnis: el
  // LegalProcess todavía no existe y se crea en esta misma transacción
  // (nace directamente GOP_ACTIVE). Si viene data.legalProcessId, es una
  // sentencia ADICIONAL sobre un GOP ya activo (litigio en curso).
  static registerVerdict = async (
    data: RegisterVerdictInput,
    tenantId: string,
    actorUserId?: string,
  ) => {
    if (data.caseTransferId) {
      return this.registerFirstVerdict(data, data.caseTransferId, tenantId, actorUserId);
    }
    if (data.legalProcessId) {
      return this.registerAdditionalVerdict(data, data.legalProcessId, tenantId, actorUserId);
    }
    throw new Error("caseTransferId of legalProcessId is verplicht.");
  };

  private static registerFirstVerdict = async (
    data: RegisterVerdictInput,
    caseTransferId: string,
    tenantId: string,
    actorUserId?: string,
  ) => {
    const caseTransfer = await prisma.caseTransfer.findUnique({
      where: { id: caseTransferId },
      include: { debtClaim: true, legalProcess: true },
    });
    if (!caseTransfer) throw new Error("Overdracht niet gevonden");
    if (caseTransfer.legalProcess) {
      throw new Error("Dit dossier heeft al een GOP-vonnis geregistreerd.");
    }
    if (!CASE_TRANSFER_VERDICT_REGISTRABLE_STATUSES.includes(caseTransfer.status)) {
      throw new Error(`Er kan geen vonnis worden geregistreerd in de status ${caseTransfer.status}.`);
    }
    if (!caseTransfer.bailiffId) {
      throw new Error("Dit dossier heeft nog geen toegewezen deurwaarder.");
    }

    const referenceNumber = await this.generateReferenceNumber();
    const totalInterest = data.verdict_interest.reduce((sum, i) => sum + i.total_interest, 0);

    const { legalProcess, verdict } = await prisma.$transaction(async (tx) => {
      const newLegalProcess = await tx.legalProcess.create({
        data: {
          debtClaimId: caseTransfer.debtClaimId,
          caseTransferId: caseTransfer.id,
          bailiffId: caseTransfer.bailiffId!,
          status: LegalProcessStatus.GOP_ACTIVE,
          referenceNumber,
          startedAt: new Date(),
        },
      });

      const newVerdict = await tx.verdict.create({
        data: {
          tenant_id: tenantId,
          debtor_id: caseTransfer.debtClaim.debtorId,
          legal_process_id: newLegalProcess.id,
          invoice_number: data.invoice_number,
          creditor_name: data.creditor_name,
          registration_number: data.registration_number,
          sentence_amount: data.sentence_amount,
          sentence_date: data.sentence_date,
          court: data.court,
          notification_date: data.notification_date,
          prescription_term_months: data.prescription_term_months,
          prescription_due_date: data.prescription_due_date,
          procesal_cost: data.procesal_cost ?? 0,
          notes: data.notes,
          bailiff_id: data.bailiff_id,
          status: "APPROVED",
        },
      });

      for (const item of data.verdict_interest) {
        const verdictInterest = await tx.verdictInterest.create({
          data: {
            interest_type: item.interest_type,
            base_amount: item.base_amount,
            calculated_interest: item.calculated_interest,
            calculation_start: item.calculation_start,
            calculation_end: item.calculation_end,
            total_interest: item.total_interest,
            verdict_id: newVerdict.id,
          },
        });
        if (item.details.length) {
          await tx.verdictInterestDetails.createMany({
            data: item.details.map((detail) => ({
              ...detail,
              verdict_interest_id: verdictInterest.id,
            })),
          });
        }
      }

      // Registrar una sentencia activa el bloqueo económico automáticamente,
      // igual que el paso BLK_NOTIFICATION del flujo AOP.
      const existingBlockade = await tx.blockade.findUnique({
        where: { originDebtClaimId: caseTransfer.debtClaimId },
      });
      if (!existingBlockade) {
        await tx.blockade.create({
          data: {
            tenantId: caseTransfer.debtClaim.tenantId,
            debtorId: caseTransfer.debtClaim.debtorId,
            reason: "UNPAID_PAYMENT",
            registeredAt: new Date(),
            status: "ACTIVE",
            originDebtClaimId: caseTransfer.debtClaimId,
          },
        });
      }

      const existingGopService = await tx.claimService.findFirst({
        where: { debtClaimId: caseTransfer.debtClaimId, service: "GOP" },
      });
      if (existingGopService) {
        await tx.claimService.update({
          where: { id: existingGopService.id },
          data: { status: "IN_PROGRESS" },
        });
      } else {
        await tx.claimService.create({
          data: {
            debtClaimId: caseTransfer.debtClaimId,
            service: "GOP",
            status: "IN_PROGRESS",
            startedAt: new Date(),
            startedById: actorUserId,
          },
        });
      }

      await tx.claimTimeline.create({
        data: {
          debtClaimId: caseTransfer.debtClaimId,
          event: "VERDICT_REGISTERED",
          description: `Vonnis ${data.registration_number} geregistreerd. GOP geactiveerd (${referenceNumber}).`,
          metadata: { verdictId: newVerdict.id, sentence_amount: data.sentence_amount, totalInterest },
          createdById: actorUserId,
        },
      });

      return { legalProcess: newLegalProcess, verdict: newVerdict };
    });

    await NotificationService.notifyTenantStaff(caseTransfer.debtClaim.tenantId, {
      type: NotificationType.GOP_ACTIVATED,
      title: "GOP activado",
      message: `Se registró la sentencia del expediente ${caseTransfer.debtClaim.reference}. El GOP está activo.`,
      link: `/legal-processes/${legalProcess.id}`,
      entity_type: "LegalProcess",
      entity_id: legalProcess.id,
    });

    await this.generateGopFeeInvoice({
      tenantId,
      debtClaimId: legalProcess.debtClaimId,
      amountBase: data.sentence_amount + totalInterest,
      concept: `Registratiekosten vonnis ${data.registration_number} (5% incl. rente)`,
    });

    return verdict;
  };

  private static registerAdditionalVerdict = async (
    data: RegisterVerdictInput,
    legalProcessId: string,
    tenantId: string,
    actorUserId?: string,
  ) => {
    const legalProcess = await prisma.legalProcess.findUnique({
      where: { id: legalProcessId },
      include: { debtClaim: true },
    });
    if (!legalProcess) throw new Error("Expediente GOP no encontrado");
    if (!VERDICT_REGISTRABLE_STATUSES.includes(legalProcess.status as LegalProcessStatus)) {
      throw new Error(`Er kan geen vonnis worden geregistreerd in de status ${legalProcess.status}.`);
    }

    const totalInterest = data.verdict_interest.reduce((sum, i) => sum + i.total_interest, 0);

    const { verdict } = await prisma.$transaction(async (tx) => {
      const newVerdict = await tx.verdict.create({
        data: {
          tenant_id: tenantId,
          debtor_id: legalProcess.debtClaim.debtorId,
          legal_process_id: legalProcess.id,
          invoice_number: data.invoice_number,
          creditor_name: data.creditor_name,
          registration_number: data.registration_number,
          sentence_amount: data.sentence_amount,
          sentence_date: data.sentence_date,
          court: data.court,
          notification_date: data.notification_date,
          prescription_term_months: data.prescription_term_months,
          prescription_due_date: data.prescription_due_date,
          procesal_cost: data.procesal_cost ?? 0,
          notes: data.notes,
          bailiff_id: data.bailiff_id,
          status: "APPROVED",
        },
      });

      for (const item of data.verdict_interest) {
        const verdictInterest = await tx.verdictInterest.create({
          data: {
            interest_type: item.interest_type,
            base_amount: item.base_amount,
            calculated_interest: item.calculated_interest,
            calculation_start: item.calculation_start,
            calculation_end: item.calculation_end,
            total_interest: item.total_interest,
            verdict_id: newVerdict.id,
          },
        });
        if (item.details.length) {
          await tx.verdictInterestDetails.createMany({
            data: item.details.map((detail) => ({
              ...detail,
              verdict_interest_id: verdictInterest.id,
            })),
          });
        }
      }

      await tx.claimTimeline.create({
        data: {
          debtClaimId: legalProcess.debtClaimId,
          event: "VERDICT_REGISTERED",
          description: `Aanvullend vonnis ${data.registration_number} geregistreerd.`,
          metadata: { verdictId: newVerdict.id, sentence_amount: data.sentence_amount, totalInterest },
          createdById: actorUserId,
        },
      });

      return { verdict: newVerdict };
    });

    await this.generateGopFeeInvoice({
      tenantId,
      debtClaimId: legalProcess.debtClaimId,
      amountBase: data.sentence_amount + totalInterest,
      concept: `Registratiekosten vonnis ${data.registration_number} (5% incl. rente)`,
    });

    return verdict;
  };

  // ---------------------------------------------------------------------
  // Medidas de ejecución, intereses y costos del alguacil durante el GOP
  // ---------------------------------------------------------------------

  static registerExecutionMeasure = async (
    data: RegisterExecutionMeasureInput,
    actorUserId?: string,
  ) => {
    const verdict = await this.getVerdictWithLegalProcess(data.verdictId);

    await this.reactivateIfInactive(verdict.legal_process_id, actorUserId);

    const measure = await prisma.verdictEmbargo.create({
      data: {
        verdict_id: data.verdictId,
        company_name: data.company_name,
        company_phone: data.company_phone,
        company_email: data.company_email,
        company_address: data.company_address,
        embargo_type: data.embargo_type,
        embargo_date: data.embargo_date,
        embargo_amount: data.embargo_amount,
        total_amount: data.total_amount,
      },
    });

    await ClaimTimelineService.logEvent(
      verdict.debtClaimId,
      "SERVICE_STARTED",
      `Executiemaatregel geregistreerd: ${data.embargo_type}`,
      { verdictId: data.verdictId, embargoId: measure.id, embargo_amount: data.embargo_amount },
      actorUserId,
    );

    return measure;
  };

  static registerInterestUpdate = async (
    data: RegisterInterestUpdateInput,
    actorUserId?: string,
  ) => {
    const verdict = await this.getVerdictWithLegalProcess(data.verdictId);

    await this.reactivateIfInactive(verdict.legal_process_id, actorUserId);

    const verdictInterest = await prisma.$transaction(async (tx) => {
      const created = await tx.verdictInterest.create({
        data: {
          interest_type: data.interest.interest_type,
          base_amount: data.interest.base_amount,
          calculated_interest: data.interest.calculated_interest,
          calculation_start: data.interest.calculation_start,
          calculation_end: data.interest.calculation_end,
          total_interest: data.interest.total_interest,
          verdict_id: data.verdictId,
        },
      });

      if (data.interest.details.length) {
        await tx.verdictInterestDetails.createMany({
          data: data.interest.details.map((detail) => ({
            ...detail,
            verdict_interest_id: created.id,
          })),
        });
      }

      return created;
    });

    await ClaimTimelineService.logEvent(
      verdict.debtClaimId,
      "STATUS_CHANGED",
      `Rente-update geregistreerd (${data.interest.interest_type})`,
      { verdictId: data.verdictId, total_interest: data.interest.total_interest },
      actorUserId,
    );

    return verdictInterest;
  };

  static registerBailiffCost = async (
    data: RegisterBailiffCostInput,
    tenantId: string,
    actorUserId?: string,
  ) => {
    const verdict = await this.getVerdictWithLegalProcess(data.verdictId);

    await this.reactivateIfInactive(verdict.legal_process_id, actorUserId);

    const cost = await prisma.verdictBailiffServices.create({
      data: {
        verdict_id: data.verdictId,
        service_invoice_number: data.service_invoice_number,
        service_type: data.service_type,
        service_cost: data.service_cost,
        status: "INVOICED",
      },
    });

    await ClaimTimelineService.logEvent(
      verdict.debtClaimId,
      "SERVICE_COMPLETED",
      `Definitieve deurwaarderskosten geregistreerd: ${data.service_type}`,
      { verdictId: data.verdictId, costId: cost.id, service_cost: data.service_cost },
      actorUserId,
    );

    await this.generateGopFeeInvoice({
      tenantId,
      debtClaimId: verdict.debtClaimId,
      amountBase: data.service_cost,
      concept: `Deurwaarderskosten ${data.service_type} (5%)`,
    });

    return cost;
  };

  // ---------------------------------------------------------------------
  // Finalización del trabajo del alguacil: costos + comisión CFSB (5%)
  // ---------------------------------------------------------------------

  static submitBailiffFeeInvoice = async (
    params: SubmitBailiffFeeInvoiceInput & {
      fileName: string;
      mimeType: string;
      size: number;
      buffer: Buffer;
    },
    actorUserId?: string,
  ) => {
    const legalProcess = await prisma.legalProcess.findUnique({
      where: { id: params.legalProcessId },
      include: { debtClaim: true, bailiff: true },
    });
    if (!legalProcess) throw new Error("Expediente GOP no encontrado");
    if (!GOP_OPERABLE_STATUSES.includes(legalProcess.status as LegalProcessStatus)) {
      throw new Error(`Kan geen kostenfactuur registreren in de status ${legalProcess.status}.`);
    }
    if (legalProcess.gopCompletedGateAt) {
      throw new Error("El trabajo del alguacil ya fue finalizado para este expediente.");
    }

    const tenantId = legalProcess.debtClaim.tenantId;
    const sanitizedName = `${crypto.randomUUID()}-${params.fileName}`.replace(/\s+/g, "-");
    const folder = `${tenantId}/legal-processes/${legalProcess.id}/bailiff-fee-invoices`;
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

    const concept = `CFSB-commissie (5%) op deurwaarderskosten — dossier ${
      legalProcess.debtClaim.reference ?? legalProcess.debtClaimId
    }`;

    const paymentResult = await PaymentService.create(tenantId, {
      amount: total_with_tax,
      currency: "USD",
      description: concept,
      reference: `gop_bailiff_fee_${legalProcess.id}_${Date.now()}`,
      payment_type: PaymentType.GOP_BAILIFF_FEE,
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

    if (legalProcess.bailiff.email) {
      await sendInvoiceEmail(legalProcess.bailiff.email, invoice.id, false);
    }

    await prisma.bailiffFeeInvoice.create({
      data: {
        legalProcessId: legalProcess.id,
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
      legalProcess.debtClaimId,
      "STATUS_CHANGED",
      `De deurwaarder registreerde zijn kostenfactuur (${params.totalAmount}). CFSB-commissie van ${total_with_tax} in behandeling.`,
      { totalAmount: params.totalAmount, cfsbFee: total_with_tax },
      actorUserId,
    );

    return { paymentId: paymentResult.data.paymentId, paymentUrl: paymentResult.data.paymentUrl };
  };

  // Se llama desde el webhook de Sentoo cuando el Payment GOP_BAILIFF_FEE se
  // confirma como pagado. Habilita el cierre del GOP (gopCompletedGateAt).
  static processBailiffFeePaymentConfirmed = async (paymentId: string) => {
    const bailiffFeeInvoice = await prisma.bailiffFeeInvoice.findUnique({
      where: { paymentId },
      include: { legalProcess: { include: { debtClaim: true, bailiff: true } } },
    });
    if (!bailiffFeeInvoice || bailiffFeeInvoice.status === "PAID") return;

    await prisma.bailiffFeeInvoice.update({
      where: { id: bailiffFeeInvoice.id },
      data: { status: "PAID", paidAt: new Date() },
    });

    await prisma.billingInvoice.updateMany({
      where: { payment_id: paymentId },
      data: { status: "paid" },
    });

    const legalProcess = bailiffFeeInvoice.legalProcess;
    await prisma.legalProcess.update({
      where: { id: legalProcess.id },
      data: { gopCompletedGateAt: new Date() },
    });

    await ClaimTimelineService.logEvent(
      legalProcess.debtClaimId,
      "STATUS_CHANGED",
      "De deurwaarder heeft zijn werk afgerond: kostenfactuur en CFSB-commissie betaald. GOP kan gesloten worden.",
    );

    await NotificationService.notifyTenantStaff(legalProcess.debtClaim.tenantId, {
      type: NotificationType.GOP_BAILIFF_WORK_FINALIZED,
      title: "Trabajo del alguacil finalizado",
      message: `Se confirmó el pago de la comisión CFSB del expediente ${legalProcess.debtClaim.reference}. Ya puede cerrar el GOP.`,
      link: `/legal-processes/${legalProcess.id}`,
      entity_type: "LegalProcess",
      entity_id: legalProcess.id,
    });
  };

  // ---------------------------------------------------------------------
  // GOP Inactivo, control de plazos y reactivación automática
  // ---------------------------------------------------------------------

  static markInactive = async (data: MarkInactiveInput, actorUserId?: string) => {
    const legalProcess = await prisma.legalProcess.findUnique({
      where: { id: data.legalProcessId },
      include: { debtClaim: true },
    });
    if (!legalProcess) throw new Error("Expediente GOP no encontrado");
    if (legalProcess.status !== LegalProcessStatus.GOP_ACTIVE) {
      throw new Error("Solo un expediente GOP Activo puede marcarse como Inactivo");
    }

    const updated = await prisma.legalProcess.update({
      where: { id: legalProcess.id },
      data: {
        status: LegalProcessStatus.GOP_INACTIVE,
        inactiveReason: data.reason,
        inactiveNotes: data.notes,
        reviewDate: data.reviewDate,
      },
    });

    await ClaimTimelineService.logEvent(
      legalProcess.debtClaimId,
      "STATUS_CHANGED",
      `GOP gemarkeerd als Inactief (${data.reason}). Revisiedatum: ${data.reviewDate.toISOString()}`,
      undefined,
      actorUserId,
    );

    await NotificationService.notifyTenantStaff(legalProcess.debtClaim.tenantId, {
      type: NotificationType.GOP_INACTIVE,
      title: "GOP marcado como inactivo",
      message: `El expediente ${legalProcess.debtClaim.reference} quedó sin resultados temporales. Próxima revisión: ${data.reviewDate.toLocaleDateString()}.`,
      link: `/legal-processes/${legalProcess.id}`,
      entity_type: "LegalProcess",
      entity_id: legalProcess.id,
    });

    return updated;
  };

  static reactivate = async (legalProcessId: string, actorUserId?: string) => {
    const legalProcess = await prisma.legalProcess.findUnique({
      where: { id: legalProcessId },
      include: { debtClaim: true },
    });
    if (!legalProcess || legalProcess.status !== LegalProcessStatus.GOP_INACTIVE) return null;

    const updated = await prisma.legalProcess.update({
      where: { id: legalProcessId },
      data: {
        status: LegalProcessStatus.GOP_ACTIVE,
        inactiveReason: null,
        inactiveNotes: null,
        reviewDate: null,
      },
    });

    await ClaimTimelineService.logEvent(
      legalProcess.debtClaimId,
      "STATUS_CHANGED",
      "GOP automatisch gereactiveerd door registratie van een nieuwe executiemaatregel",
      undefined,
      actorUserId,
    );

    await NotificationService.notifyTenantStaff(legalProcess.debtClaim.tenantId, {
      type: NotificationType.GOP_REACTIVATED,
      title: "GOP reactivado",
      message: `El expediente ${legalProcess.debtClaim.reference} volvió a estar Activo.`,
      link: `/legal-processes/${legalProcess.id}`,
      entity_type: "LegalProcess",
      entity_id: legalProcess.id,
    });

    return updated;
  };

  private static reactivateIfInactive = async (legalProcessId: string, actorUserId?: string) => {
    const legalProcess = await prisma.legalProcess.findUnique({ where: { id: legalProcessId } });
    if (legalProcess?.status === LegalProcessStatus.GOP_INACTIVE) {
      await this.reactivate(legalProcessId, actorUserId);
    }
  };

  // ---------------------------------------------------------------------
  // Cambio de alguacil
  // ---------------------------------------------------------------------

  static changeBailiff = async (data: ChangeBailiffInput, actorUserId?: string) => {
    const legalProcess = await prisma.legalProcess.findUnique({
      where: { id: data.legalProcessId },
      include: { debtClaim: true },
    });
    if (!legalProcess) throw new Error("Expediente GOP no encontrado");
    if (legalProcess.status === LegalProcessStatus.CLOSED) {
      throw new Error("No se puede cambiar de alguacil en un expediente cerrado");
    }

    const newBailiff = await prisma.bailiff.findUnique({ where: { id: data.newBailiffId } });
    if (!newBailiff) throw new Error("Alguacil no encontrado");

    const previousBailiffId = legalProcess.bailiffId;

    const updated = await prisma.legalProcess.update({
      where: { id: legalProcess.id },
      data: { bailiffId: data.newBailiffId },
    });

    await ClaimTimelineService.logEvent(
      legalProcess.debtClaimId,
      "BAILIFF_ASSIGNED",
      `Wijziging van deurwaarder geregistreerd`,
      { field: "bailiffId", oldValue: previousBailiffId, newValue: data.newBailiffId },
      actorUserId,
    );

    const notifyUserIds: string[] = [];
    if (newBailiff.user_id) notifyUserIds.push(newBailiff.user_id);
    if (previousBailiffId) {
      const previousBailiff = await prisma.bailiff.findUnique({ where: { id: previousBailiffId } });
      if (previousBailiff?.user_id) notifyUserIds.push(previousBailiff.user_id);
    }
    if (notifyUserIds.length) {
      await NotificationService.createMany(notifyUserIds, {
        tenant_id: legalProcess.debtClaim.tenantId,
        type: NotificationType.GOP_BAILIFF_CHANGED,
        title: "Cambio de alguacil",
        message: `El expediente ${legalProcess.debtClaim.reference} cambió de alguacil.`,
        link: `/legal-processes/${legalProcess.id}`,
        entity_type: "LegalProcess",
        entity_id: legalProcess.id,
      });
    }

    await NotificationService.notifyTenantStaff(legalProcess.debtClaim.tenantId, {
      type: NotificationType.GOP_BAILIFF_CHANGED,
      title: "Cambio de alguacil",
      message: `El expediente ${legalProcess.debtClaim.reference} ahora está a cargo de ${newBailiff.fullname}.`,
      link: `/legal-processes/${legalProcess.id}`,
      entity_type: "LegalProcess",
      entity_id: legalProcess.id,
    });

    return updated;
  };

  // ---------------------------------------------------------------------
  // Cierre
  // ---------------------------------------------------------------------

  static close = async (legalProcessId: string, actorUserId?: string) => {
    const legalProcess = await prisma.legalProcess.findUnique({
      where: { id: legalProcessId },
      include: { debtClaim: { include: { debtor: true } }, bailiff: true },
    });
    if (!legalProcess) throw new Error("Expediente GOP no encontrado");
    if (
      ![LegalProcessStatus.GOP_ACTIVE, LegalProcessStatus.GOP_INACTIVE].includes(
        legalProcess.status as LegalProcessStatus,
      )
    ) {
      throw new Error("Solo un expediente GOP Activo o Inactivo puede cerrarse");
    }
    if (!legalProcess.gopCompletedGateAt) {
      throw new Error(
        "Debe finalizar su trabajo (factura de costos y pago de la comisión CFSB) antes de cerrar el GOP.",
      );
    }

    const updated = await prisma.legalProcess.update({
      where: { id: legalProcess.id },
      data: { status: LegalProcessStatus.CLOSED, closedAt: new Date() },
    });

    await prisma.claimService.updateMany({
      where: { debtClaimId: legalProcess.debtClaimId, service: "GOP" },
      data: { status: "COMPLETED", finishedAt: new Date(), finishedById: actorUserId },
    });

    await BlockadeService.suspendActiveForDebtor(
      legalProcess.debtClaim.debtorId,
      legalProcess.debtClaim.tenantId,
    );

    await ClaimTimelineService.logEvent(
      legalProcess.debtClaimId,
      "GOP_COMPLETED",
      "Vonnis volledig voldaan. GOP-dossier gesloten.",
      undefined,
      actorUserId,
    );

    await NotificationService.notifyTenantStaff(legalProcess.debtClaim.tenantId, {
      type: NotificationType.GOP_CLOSED,
      title: "GOP cerrado",
      message: `El expediente ${legalProcess.debtClaim.reference} se cerró: la sentencia fue cumplida en su totalidad.`,
      link: `/legal-processes/${legalProcess.id}`,
      entity_type: "LegalProcess",
      entity_id: legalProcess.id,
    });

    const notifyUserIds: string[] = [];
    if (legalProcess.bailiff?.user_id) notifyUserIds.push(legalProcess.bailiff.user_id);
    if (legalProcess.debtClaim.debtor.user_id) notifyUserIds.push(legalProcess.debtClaim.debtor.user_id);
    if (notifyUserIds.length) {
      await NotificationService.createMany(notifyUserIds, {
        tenant_id: legalProcess.debtClaim.tenantId,
        type: NotificationType.GOP_CLOSED,
        title: "GOP cerrado",
        message: `El expediente ${legalProcess.debtClaim.reference} fue cerrado: sentencia cumplida en su totalidad.`,
        link: `/legal-processes/${legalProcess.id}`,
        entity_type: "LegalProcess",
        entity_id: legalProcess.id,
      });
    }

    return updated;
  };

  // Cuando un pago deja saldadas todas las obligaciones del GOP, el cierre
  // debe efectuarse igual que si el alguacil lo cerrara a mano (incluye el
  // caso de la última cuota de un acuerdo de pago).
  static checkAndCloseIfSettled = async (debtClaimId: string, actorUserId?: string) => {
    const legalProcess = await prisma.legalProcess.findUnique({ where: { debtClaimId } });
    if (
      !legalProcess ||
      ![LegalProcessStatus.GOP_ACTIVE, LegalProcessStatus.GOP_INACTIVE].includes(
        legalProcess.status as LegalProcessStatus,
      )
    ) {
      return null;
    }

    const totalObligations = await prisma.debtClaimObligation.count({ where: { debtClaimId } });
    if (totalObligations === 0) return null;

    const pendingObligations = await prisma.debtClaimObligation.count({
      where: { debtClaimId, status: { in: ["PENDING", "PARTIALLY_PAID"] } },
    });
    if (pendingObligations > 0) return null;

    return this.close(legalProcess.id, actorUserId);
  };

  // ---------------------------------------------------------------------
  // Helpers privados
  // ---------------------------------------------------------------------

  private static getVerdictWithLegalProcess = async (verdictId: string) => {
    const verdict = await prisma.verdict.findUnique({
      where: { id: verdictId },
      include: { legal_process: { include: { debtClaim: true } } },
    });
    if (!verdict) throw new Error("Vonnis no encontrado");
    if (!GOP_OPERABLE_STATUSES.includes(verdict.legal_process.status as LegalProcessStatus)) {
      throw new Error(
        `Deze actie is niet toegestaan in de status ${verdict.legal_process.status}.`,
      );
    }

    return { ...verdict, debtClaimId: verdict.legal_process.debtClaimId };
  };

  // Factura automática del 5% (sentencia+intereses, o costos del alguacil)
  // al participante.
  private static generateGopFeeInvoice = async (params: {
    tenantId: string;
    debtClaimId: string;
    amountBase: number;
    concept: string;
  }) => {
    try {
      const tenant = await prisma.tenant.findUnique({ where: { id: params.tenantId } });
      if (!tenant) throw new Error("Tenant not found");

      const parameter = await ParameterService.getParameter();
      const fee = Math.round(params.amountBase * GOP_FEE_RATE * 100) / 100;
      const tax_rate = parameter?.abb_rate ?? 0;
      const tax_amount = Math.round(((fee * tax_rate) / 100) * 100) / 100;
      const total_with_tax = fee + tax_amount;

      const paymentResult = await PaymentService.create(params.tenantId, {
        amount: total_with_tax,
        currency: "USD",
        description: params.concept,
        reference: `gop_${params.debtClaimId}_${Date.now()}`,
        payment_type: PaymentType.GOP,
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
          description: params.concept,
          status: "unpaid",
          tenant_id: params.tenantId,
          currency: "USD",
          amount: total_with_tax,
          invoice_details: [
            {
              item_description: params.concept,
              item_quantity: 1,
              item_unit_price: fee,
              item_total_price: fee,
              item_tax_rate: tax_rate,
              item_tax_amount: tax_amount,
              item_total_with_tax: total_with_tax,
            },
          ],
        },
        params.tenantId,
        paymentResult.data.paymentId,
      );

      if (tenant.contact_email) {
        await sendInvoiceEmail(tenant.contact_email, invoice.id, false);
      }

      await DebtFineService.applyCharge(params.debtClaimId, total_with_tax, params.concept, "GOP");

      return invoice;
    } catch (error) {
      console.error("Error generating GOP fee invoice:", error);

      await ClaimTimelineService.logEvent(
        params.debtClaimId,
        "STATUS_CHANGED",
        `Automatische facturering mislukt (${params.concept}): ${
          error instanceof Error ? error.message : "onbekende fout"
        }`,
      );

      return null;
    }
  };

  // Se llama desde el webhook de Sentoo (vía payment-processor) cuando un
  // Payment de tipo GOP se confirma como pagado.
  static processGopFeePaymentConfirmed = async (paymentId: string) => {
    const invoice = await prisma.billingInvoice.findUnique({
      where: { payment_id: paymentId },
    });
    if (!invoice) return;

    await prisma.billingInvoice.update({
      where: { id: invoice.id },
      data: { status: "paid" },
    });
  };

  // ---------------------------------------------------------------------
  // Documentos del expediente (post-vonnis)
  // ---------------------------------------------------------------------

  static uploadDocument = async (params: {
    legalProcessId: string;
    tenantId: string;
    uploadedById?: string;
    fileName: string;
    mimeType: string;
    size: number;
    buffer: Buffer;
    category?: string;
  }) => {
    const sanitizedName = `${crypto.randomUUID()}-${params.fileName}`.replace(/\s+/g, "-");
    const folder = `${params.tenantId}/legal-processes/${params.legalProcessId}`;
    const storageKey = await StorageService.uploadFile(
      folder,
      sanitizedName,
      params.mimeType,
      params.buffer,
    );

    return prisma.legalProcessDocument.create({
      data: {
        legalProcessId: params.legalProcessId,
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

  static getDocuments = async (legalProcessId: string) => {
    return prisma.legalProcessDocument.findMany({
      where: { legalProcessId },
      orderBy: { createdAt: "desc" },
    });
  };

  static getDocumentById = async (documentId: string) => {
    return prisma.legalProcessDocument.findUnique({ where: { id: documentId } });
  };

  static deleteDocument = async (documentId: string) => {
    const document = await prisma.legalProcessDocument.findUnique({ where: { id: documentId } });
    if (!document) throw new Error("Document niet gevonden");

    await StorageService.removeDocument(document.storageKey);
    await prisma.legalProcessDocument.delete({ where: { id: documentId } });
  };

  // ---------------------------------------------------------------------
  // Pagos del deudor durante el GOP
  // ---------------------------------------------------------------------

  static getPrincipalObligation = async (debtClaimId: string) => {
    const obligation = await prisma.debtClaimObligation.findFirst({
      where: {
        debtClaimId,
        type: "PRINCIPAL_DEBT",
        beneficiary: "PARTICIPANT",
      },
      orderBy: { createdAt: "desc" },
    });
    if (!obligation) return null;

    return {
      ...obligation,
      originalAmount: Number(obligation.originalAmount),
      paidAmount: Number(obligation.paidAmount),
      balanceAmount: Number(obligation.balanceAmount),
    };
  };

  // El alguacil es un actor de confianza dentro del proceso judicial: el
  // pago se aplica de inmediato al saldo, sin el paso de verificación
  // posterior que sí usa el comprobante de transferencia del deudor.
  static registerPayment = async (
    legalProcessId: string,
    amount: number,
    actorUserId?: string,
  ) => {
    const legalProcess = await prisma.legalProcess.findUnique({
      where: { id: legalProcessId },
      include: { debtClaim: true },
    });
    if (!legalProcess) throw new Error("Expediente GOP no encontrado");

    const obligation = await ObligationService.ensurePrincipalDebtObligation(
      legalProcess.debtClaimId,
      Number(legalProcess.debtClaim.principalAmount),
    );

    const payment = await prisma.payment.create({
      data: {
        tenant_id: legalProcess.debtClaim.tenantId,
        obligation_id: obligation.id,
        total_amount: amount,
        status: "paid",
        paid_at: new Date(),
        method: "TRANSFER",
        payment_type: PaymentType.DEBT_PAYMENT,
        reference_number: `gop_payment_${legalProcess.id}_${Date.now()}`,
      },
    });

    const updatedObligation = await ObligationService.applyPayment(payment.id);

    await ClaimTimelineService.logEvent(
      legalProcess.debtClaimId,
      "PAYMENT_REGISTERED",
      `Betaling van ${amount} geregistreerd door deurwaarder. Nieuw saldo: ${updatedObligation.balanceAmount}.`,
      { paymentId: payment.id, amount, balanceAmount: Number(updatedObligation.balanceAmount) },
      actorUserId,
    );

    return { payment, obligation: updatedObligation };
  };
}
