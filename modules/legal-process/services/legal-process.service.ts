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
  DEFAULT_GOP_FEE_RATE_PERCENT,
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
import { SettingsService } from "@/modules/settings/services/settings/settings.service";
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
  // LegalProcess todavía no existe y se crea en esta misma transacción, pero
  // como BORRADOR (GOP_DRAFT) — el GOP solo pasa a GOP_ACTIVE cuando se
  // confirma el pago de la comisión CFSB (ver processGopActivationPaymentConfirmed).
  // Si viene data.legalProcessId, es una sentencia ADICIONAL sobre un GOP ya
  // activo (litigio en curso) — eso no cambia, sigue sin gate de pago.
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
      include: { debtClaim: true, legalProcess: { include: { gopActivationPayment: true } } },
    });
    if (!caseTransfer) throw new Error("Overdracht niet gevonden");
    if (caseTransfer.legalProcess) {
      // Ya existe un borrador de vonnis esperando el pago de la comisión de
      // activación: reusar ese link de pago en vez de fallar/duplicar.
      const draftPayment = caseTransfer.legalProcess.gopActivationPayment;
      if (
        caseTransfer.legalProcess.status === LegalProcessStatus.GOP_DRAFT &&
        draftPayment?.status === "pending" &&
        draftPayment.payment_url
      ) {
        return {
          legalProcessId: caseTransfer.legalProcess.id,
          verdictId: null,
          paymentId: draftPayment.id,
          paymentUrl: draftPayment.payment_url,
        };
      }
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

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new Error("Tenant not found");

    // ABB por isla/jurisdicción del tenant (punto 13 del análisis CFSB), y
    // comisión GOP configurable vía Settings/Tarieven (gop_fee_rate).
    const parameter = await ParameterService.getParameterForTenant(tenantId);
    const gopFeePercent = await SettingsService.resolveNumber(
      "gop_fee_rate",
      { tenantId, jurisdictionId: tenant.jurisdictionId },
      DEFAULT_GOP_FEE_RATE_PERCENT,
    );
    const amountBase = data.sentence_amount + totalInterest;
    const fee = Math.round(amountBase * (gopFeePercent / 100) * 100) / 100;
    const tax_rate = parameter?.abb_rate ?? 0;
    const tax_amount = Math.round(((fee * tax_rate) / 100) * 100) / 100;
    const total_with_tax = fee + tax_amount;
    const concept = `Registratiekosten vonnis ${data.registration_number} (5% incl. rente)`;

    // El pago se crea ANTES del borrador (mismo orden que
    // CollectiveCollectionService.requestStart): si Sentoo falla, no queda
    // ningún LegalProcess/Verdict huérfano.
    const paymentResult = await PaymentService.create(tenantId, {
      amount: total_with_tax,
      currency: "USD",
      description: concept,
      reference: `gop_activation_${caseTransfer.debtClaimId}_${Date.now()}`,
      payment_type: PaymentType.GOP_ACTIVATION,
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
    if (tenant.contact_email) {
      await sendInvoiceEmail(tenant.contact_email, invoice.id, false);
    }

    const { legalProcess, verdict } = await prisma.$transaction(async (tx) => {
      const newLegalProcess = await tx.legalProcess.create({
        data: {
          debtClaimId: caseTransfer.debtClaimId,
          caseTransferId: caseTransfer.id,
          bailiffId: caseTransfer.bailiffId!,
          status: LegalProcessStatus.GOP_DRAFT,
          gopActivationPaymentId: paymentResult.data!.paymentId,
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
          status: "DRAFT",
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

      // Punto 1: la pantalla única de registro permite cargar embargos y
      // costos del alguacil en el mismo paso (aunque el GOP siga en borrador
      // hasta que se pague la comisión de activación).
      for (const item of data.verdict_embargo) {
        await tx.verdictEmbargo.create({
          data: { ...item, verdict_id: newVerdict.id },
        });
      }
      for (const item of data.bailiff_services) {
        await tx.verdictBailiffServices.create({
          data: { ...item, verdict_id: newVerdict.id, status: "INVOICED" },
        });
      }

      await tx.claimTimeline.create({
        data: {
          debtClaimId: caseTransfer.debtClaimId,
          event: "STATUS_CHANGED",
          description: `Vonnis ${data.registration_number} geregistreerd als borrador (${referenceNumber}). In afwachting van de betaling van de GOP-activeringscommissie.`,
          metadata: { verdictId: newVerdict.id, sentence_amount: data.sentence_amount, totalInterest },
          createdById: actorUserId,
        },
      });

      return { legalProcess: newLegalProcess, verdict: newVerdict };
    });

    return {
      legalProcessId: legalProcess.id,
      verdictId: verdict.id,
      paymentId: paymentResult.data.paymentId,
      paymentUrl: paymentResult.data.paymentUrl,
    };
  };

  // Se llama desde el webhook de Sentoo (vía payment-processor) cuando un
  // Payment de tipo GOP_ACTIVATION se confirma como pagado: recién ahí el
  // borrador (GOP_DRAFT) pasa a GOP_ACTIVE, el vonnis a APPROVED, se activa
  // el bloqueo económico (o se reutiliza el existente) y arranca el
  // ClaimService GOP — exactamente lo que antes hacía registerFirstVerdict
  // de forma inmediata y sin gate de pago.
  static processGopActivationPaymentConfirmed = async (paymentId: string) => {
    const legalProcess = await prisma.legalProcess.findUnique({
      where: { gopActivationPaymentId: paymentId },
      include: { debtClaim: true, verdicts: true },
    });
    if (!legalProcess || legalProcess.status !== LegalProcessStatus.GOP_DRAFT) return;

    const verdict = legalProcess.verdicts[0];

    await prisma.$transaction(async (tx) => {
      await tx.legalProcess.update({
        where: { id: legalProcess.id },
        data: { status: LegalProcessStatus.GOP_ACTIVE },
      });

      if (verdict) {
        await tx.verdict.update({
          where: { id: verdict.id },
          data: { status: "APPROVED" },
        });
      }

      // Registrar una sentencia activa el bloqueo económico automáticamente,
      // igual que el paso BLK_NOTIFICATION del flujo AOP. Si ya existe un
      // BLK del expediente anterior, no se crea uno nuevo — se conserva su
      // estado/historial/origen tal cual.
      const existingBlockade = await tx.blockade.findUnique({
        where: { originDebtClaimId: legalProcess.debtClaimId },
      });
      if (!existingBlockade) {
        await tx.blockade.create({
          data: {
            tenantId: legalProcess.debtClaim.tenantId,
            debtorId: legalProcess.debtClaim.debtorId,
            reason: "UNPAID_PAYMENT",
            registeredAt: new Date(),
            status: "ACTIVE",
            originDebtClaimId: legalProcess.debtClaimId,
          },
        });
      }

      const existingGopService = await tx.claimService.findFirst({
        where: { debtClaimId: legalProcess.debtClaimId, service: "GOP" },
      });
      if (existingGopService) {
        await tx.claimService.update({
          where: { id: existingGopService.id },
          data: { status: "IN_PROGRESS" },
        });
      } else {
        await tx.claimService.create({
          data: {
            debtClaimId: legalProcess.debtClaimId,
            service: "GOP",
            status: "IN_PROGRESS",
            startedAt: new Date(),
          },
        });
      }

      await tx.claimTimeline.create({
        data: {
          debtClaimId: legalProcess.debtClaimId,
          event: "VERDICT_REGISTERED",
          description: `Betaling van de GOP-activeringscommissie bevestigd. Vonnis ${
            verdict?.registration_number ?? ""
          } definitief geregistreerd. GOP geactiveerd (${legalProcess.referenceNumber}).`,
        },
      });

      await tx.billingInvoice.updateMany({
        where: { payment_id: paymentId },
        data: { status: "paid" },
      });
    });

    await NotificationService.notifyTenantStaff(legalProcess.debtClaim.tenantId, {
      type: NotificationType.GOP_ACTIVATED,
      title: "GOP geactiveerd",
      message: `Het vonnis van dossier ${legalProcess.debtClaim.reference} werd geregistreerd. Het GOP is actief.`,
      link: `/legal-processes/${legalProcess.id}`,
      entity_type: "LegalProcess",
      entity_id: legalProcess.id,
    });
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
    if (!legalProcess) throw new Error("GOP-dossier niet gevonden");
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

      for (const item of data.verdict_embargo) {
        await tx.verdictEmbargo.create({
          data: { ...item, verdict_id: newVerdict.id },
        });
      }
      for (const item of data.bailiff_services) {
        await tx.verdictBailiffServices.create({
          data: { ...item, verdict_id: newVerdict.id, status: "INVOICED" },
        });
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

  // Requisito para poder cerrar el GOP: toda actuación oficial registrada
  // debe quedar explícitamente marcada como concluida.
  static getExecutionMeasures = async (legalProcessId: string) => {
    return prisma.verdictEmbargo.findMany({
      where: { verdict: { legal_process_id: legalProcessId } },
      include: { verdict: { select: { registration_number: true } } },
      orderBy: { created_at: "desc" },
    });
  };

  static completeExecutionMeasure = async (embargoId: string, actorUserId?: string) => {
    const measure = await prisma.verdictEmbargo.findUnique({
      where: { id: embargoId },
      include: { verdict: { include: { legal_process: true } } },
    });
    if (!measure) throw new Error("Executiemaatregel niet gevonden.");
    if (measure.status === "COMPLETED") return measure;

    const updated = await prisma.verdictEmbargo.update({
      where: { id: embargoId },
      data: { status: "COMPLETED", completed_at: new Date() },
    });

    await ClaimTimelineService.logEvent(
      measure.verdict.legal_process.debtClaimId,
      "SERVICE_COMPLETED",
      `Executiemaatregel afgerond: ${measure.embargo_type}`,
      { verdictId: measure.verdict_id, embargoId },
      actorUserId,
    );

    return updated;
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
        service_date: data.service_date,
        description: data.description,
        document_storage_key: data.document_storage_key,
        document_original_name: data.document_original_name,
        document_mime_type: data.document_mime_type,
        document_size: data.document_size,
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

  // Suma de las actuaciones/costos ya facturados por el alguacil para este
  // GOP — se usa para advertir (no bloquear) si no calza con el importe de
  // la factura final que el alguacil declara en submitBailiffFeeInvoice.
  static getBailiffCostsSummary = async (legalProcessId: string) => {
    const costs = await prisma.verdictBailiffServices.findMany({
      where: { verdict: { legal_process_id: legalProcessId }, status: "INVOICED" },
      select: { service_cost: true },
    });
    return costs.reduce((sum, c) => sum + c.service_cost, 0);
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
    if (!legalProcess) throw new Error("GOP-dossier niet gevonden");
    if (!GOP_OPERABLE_STATUSES.includes(legalProcess.status as LegalProcessStatus)) {
      throw new Error(`Kan geen kostenfactuur registreren in de status ${legalProcess.status}.`);
    }
    if (legalProcess.gopCompletedGateAt) {
      throw new Error("Het werk van de deurwaarder is al afgerond voor dit dossier.");
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
      title: "Werk van de deurwaarder afgerond",
      message: `De betaling van de CFSB-commissie voor dossier ${legalProcess.debtClaim.reference} werd bevestigd. Het GOP kan nu gesloten worden.`,
      link: `/legal-processes/${legalProcess.id}`,
      entity_type: "LegalProcess",
      entity_id: legalProcess.id,
    });
  };

  // ---------------------------------------------------------------------
  // "In onderzoek naar executiemogelijkheden": een sentencia zonder actuele
  // beslagmogelijkheid sluit het GOP nooit vanzelf — het dossier blijft
  // open, de sentencia blijft geregistreerd en de blokkade blijft actief.
  // Zodra een nieuwe executiemaatregel/rente-update/kost wordt geregistreerd,
  // reactiveert het dossier automatisch (zie reactivateIfInactive).
  // ---------------------------------------------------------------------

  static markInactive = async (data: MarkInactiveInput, actorUserId?: string) => {
    const legalProcess = await prisma.legalProcess.findUnique({
      where: { id: data.legalProcessId },
      include: { debtClaim: true },
    });
    if (!legalProcess) throw new Error("GOP-dossier niet gevonden");
    if (legalProcess.status !== LegalProcessStatus.GOP_ACTIVE) {
      throw new Error("Alleen een Actief GOP-dossier kan op 'geen executiemogelijkheid' gezet worden");
    }

    const updated = await prisma.legalProcess.update({
      where: { id: legalProcess.id },
      data: {
        status: LegalProcessStatus.GOP_INACTIVE,
        inactiveReason: data.reason,
        inactiveNotes: data.notes,
        inactiveFoundAt: data.foundAt,
        reviewDate: data.reviewDate,
      },
    });

    await ClaimTimelineService.logEvent(
      legalProcess.debtClaimId,
      "STATUS_CHANGED",
      `Geen executiemogelijkheid vastgesteld (${data.reason}) op ${data.foundAt.toISOString()}. Dossier in onderzoek naar executiemogelijkheden. Volgende controle: ${data.reviewDate.toISOString()}.`,
      undefined,
      actorUserId,
    );

    await NotificationService.notifyTenantStaff(legalProcess.debtClaim.tenantId, {
      type: NotificationType.GOP_INACTIVE,
      title: "In onderzoek naar executiemogelijkheden",
      message: `Dossier ${legalProcess.debtClaim.reference} heeft momenteel geen executiemogelijkheid. De sentencia blijft geregistreerd en de blokkade actief. Volgende controle: ${data.reviewDate.toLocaleDateString()}.`,
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
        inactiveFoundAt: null,
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
      title: "GOP heractiveerd",
      message: `Dossier ${legalProcess.debtClaim.reference} is weer Actief.`,
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
    if (!legalProcess) throw new Error("GOP-dossier niet gevonden");
    if (legalProcess.status === LegalProcessStatus.CLOSED) {
      throw new Error("De deurwaarder kan niet gewijzigd worden in een gesloten dossier");
    }

    const newBailiff = await prisma.bailiff.findUnique({ where: { id: data.newBailiffId } });
    if (!newBailiff) throw new Error("Deurwaarder niet gevonden");

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
        title: "Deurwaarder gewijzigd",
        message: `Dossier ${legalProcess.debtClaim.reference} heeft een nieuwe deurwaarder gekregen.`,
        link: `/legal-processes/${legalProcess.id}`,
        entity_type: "LegalProcess",
        entity_id: legalProcess.id,
      });
    }

    await NotificationService.notifyTenantStaff(legalProcess.debtClaim.tenantId, {
      type: NotificationType.GOP_BAILIFF_CHANGED,
      title: "Deurwaarder gewijzigd",
      message: `Dossier ${legalProcess.debtClaim.reference} is nu toegewezen aan ${newBailiff.fullname}.`,
      link: `/legal-processes/${legalProcess.id}`,
      entity_type: "LegalProcess",
      entity_id: legalProcess.id,
    });

    return updated;
  };

  // ---------------------------------------------------------------------
  // Cierre
  // ---------------------------------------------------------------------

  // Checklist completo antes de permitir el cierre manual del GOP. Cada
  // ítem corresponde a una validación de negocio explícita — no alcanza
  // con el gate de la factura CFSB del alguacil (gopCompletedGateAt), que
  // solo cubre 2 de los 8 puntos requeridos.
  private static assertCloseable = async (legalProcessId: string) => {
    const legalProcess = await prisma.legalProcess.findUnique({
      where: { id: legalProcessId },
      include: {
        debtClaim: { include: { debtor: true } },
        bailiff: true,
        agreements: true,
        verdicts: { include: { bailiff_services: true, verdict_embargo: true } },
      },
    });
    if (!legalProcess) throw new Error("GOP-dossier niet gevonden");
    if (
      ![LegalProcessStatus.GOP_ACTIVE, LegalProcessStatus.GOP_INACTIVE].includes(
        legalProcess.status as LegalProcessStatus,
      )
    ) {
      throw new Error("Alleen een Actief of Inactief GOP-dossier kan gesloten worden");
    }

    // 1) Factura del alguacil registrada + 2) factura CFSB pagada — ambos
    // cubiertos por gopCompletedGateAt (ver submitBailiffFeeInvoice /
    // processBailiffFeePaymentConfirmed).
    if (!legalProcess.gopCompletedGateAt) {
      throw new Error(
        "De factuur van de deurwaarder moet geregistreerd en de CFSB-commissie (5%) betaald zijn voordat het GOP gesloten kan worden.",
      );
    }

    // 3) Cobro total de la deuda confirmado por el participante.
    const obligation = await prisma.debtClaimObligation.findFirst({
      where: { debtClaimId: legalProcess.debtClaimId, type: "PRINCIPAL_DEBT", beneficiary: "PARTICIPANT" },
      orderBy: { createdAt: "desc" },
    });
    if (obligation && Number(obligation.balanceAmount) > 0) {
      throw new Error(
        `Nog niet volledig betaald: openstaand saldo van ${Number(obligation.balanceAmount)}.`,
      );
    }

    // 4) Todos los pagos confirmados + 5) ningún pago en disputa.
    const unresolvedPayments = await prisma.gopPaymentConfirmation.findMany({
      where: { legalProcessId, status: { not: "CONFIRMED" } },
    });
    const disputed = unresolvedPayments.filter((p) => p.status === "DISPUTED");
    if (disputed.length > 0) {
      throw new Error(
        `Er ${disputed.length === 1 ? "is" : "zijn"} nog ${disputed.length} betwiste betaling(en) die eerst opgelost moeten worden.`,
      );
    }
    if (unresolvedPayments.length > 0) {
      throw new Error(
        `Er ${unresolvedPayments.length === 1 ? "is" : "zijn"} nog ${unresolvedPayments.length} betaling(en) die niet bevestigd zijn door de andere partij.`,
      );
    }

    // 6) Todos los costos del alguacil finalizados (al menos facturados,
    // ninguno todavía en borrador).
    const pendingCosts = legalProcess.verdicts.flatMap((v) =>
      v.bailiff_services.filter((c) => c.status === "PENDING"),
    );
    if (pendingCosts.length > 0) {
      throw new Error("Er zijn nog niet-gefactureerde deurwaarderskosten voor dit dossier.");
    }

    // 7) Todas las actuaciones oficiales (medidas de ejecución) concluidas.
    const pendingMeasures = legalProcess.verdicts.flatMap((v) =>
      v.verdict_embargo.filter((e) => e.status === "IN_PROGRESS"),
    );
    if (pendingMeasures.length > 0) {
      throw new Error(
        `Er ${pendingMeasures.length === 1 ? "is" : "zijn"} nog ${pendingMeasures.length} executiemaatregel(en) niet afgerond.`,
      );
    }

    // 8) Ningún acuerdo de pago pendiente.
    const pendingAgreements = legalProcess.agreements.filter((a) =>
      ["PENDING", "IN_NEGOTIATION", "COUNTEROFFER"].includes(a.status),
    );
    if (pendingAgreements.length > 0) {
      throw new Error("Er is nog een betalingsregeling in behandeling voor dit dossier.");
    }

    return legalProcess;
  };

  static close = async (legalProcessId: string, actorUserId?: string) => {
    const legalProcess = await this.assertCloseable(legalProcessId);

    const updated = await prisma.legalProcess.update({
      where: { id: legalProcess.id },
      data: { status: LegalProcessStatus.CLOSED, closedAt: new Date() },
    });

    await prisma.claimService.updateMany({
      where: { debtClaimId: legalProcess.debtClaimId, service: "GOP" },
      data: { status: "COMPLETED", finishedAt: new Date(), finishedById: actorUserId },
    });

    await BlockadeService.releaseForSettledDebtClaim(
      legalProcess.debtClaimId,
      legalProcess.debtClaim.debtorId,
      legalProcess.debtClaim.tenantId,
      actorUserId,
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
      title: "GOP gesloten",
      message: `Dossier ${legalProcess.debtClaim.reference} is gesloten: het vonnis werd volledig voldaan.`,
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
        title: "GOP gesloten",
        message: `Dossier ${legalProcess.debtClaim.reference} is gesloten: vonnis volledig voldaan.`,
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

    // El cierre automático es "mejor esfuerzo": si la deuda quedó saldada
    // pero todavía falta algún otro requisito del checklist (factura del
    // alguacil, actuación oficial sin concluir, etc.), no se fuerza el
    // cierre — el alguacil lo cierra manualmente cuando esté todo listo.
    try {
      return await this.close(legalProcess.id, actorUserId);
    } catch {
      return null;
    }
  };

  // ---------------------------------------------------------------------
  // Helpers privados
  // ---------------------------------------------------------------------

  private static getVerdictWithLegalProcess = async (verdictId: string) => {
    const verdict = await prisma.verdict.findUnique({
      where: { id: verdictId },
      include: { legal_process: { include: { debtClaim: true } } },
    });
    if (!verdict) throw new Error("Vonnis niet gevonden");
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

      // ABB por isla/jurisdicción del tenant (punto 13 del análisis CFSB).
      const parameter = await ParameterService.getParameterForTenant(params.tenantId);
      const gopFeePercent = await SettingsService.resolveNumber(
        "gop_fee_rate",
        { tenantId: params.tenantId, jurisdictionId: tenant.jurisdictionId },
        DEFAULT_GOP_FEE_RATE_PERCENT,
      );
      const fee = Math.round(params.amountBase * (gopFeePercent / 100) * 100) / 100;
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

  // Documento de respaldo de un embargo o costo del alguacil, subido desde
  // la pantalla única de registro de sentencia (Punto 1/2) antes de que la
  // fila exista en la base — solo devuelve la metadata de almacenamiento
  // para que el formulario la incluya en el payload de registro.
  static uploadSupportingDocument = async (params: {
    tenantId: string;
    contextId: string;
    fileName: string;
    mimeType: string;
    size: number;
    buffer: Buffer;
  }) => {
    const sanitizedName = `${crypto.randomUUID()}-${params.fileName}`.replace(/\s+/g, "-");
    const folder = `${params.tenantId}/legal-processes/${params.contextId}/verdict-supporting-documents`;
    const storageKey = await StorageService.uploadFile(folder, sanitizedName, params.mimeType, params.buffer);

    return {
      document_storage_key: storageKey,
      document_original_name: params.fileName,
      document_mime_type: params.mimeType,
      document_size: params.size,
    };
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

  // ---------------------------------------------------------------------
  // Confirmación centralizada de pagos (AT-009 revisado): el deudor puede
  // pagar al alguacil o directamente al participante. Quien recibe
  // registra + sube comprobante (REGISTERED → AWAITING_CONFIRMATION); la
  // OTRA parte confirma (CONFIRMED, recién ahí se aplica al saldo) o
  // disputa (DISPUTED); quien registró puede entonces corregir (CORRECTED)
  // y vuelve a quedar a la espera de confirmación.
  // ---------------------------------------------------------------------

  private static paymentConfirmationInclude = {
    payment: true,
    legalProcess: { include: { debtClaim: true, bailiff: true } },
  } satisfies Prisma.GopPaymentConfirmationInclude;

  static registerGopPayment = async (
    legalProcessId: string,
    data: {
      amount: number;
      receivedBy: "BAILIFF" | "PARTICIPANT";
      fileName: string;
      mimeType: string;
      size: number;
      buffer: Buffer;
    },
    actorUserId?: string,
  ) => {
    const legalProcess = await prisma.legalProcess.findUnique({
      where: { id: legalProcessId },
      include: { debtClaim: true, bailiff: true },
    });
    if (!legalProcess) throw new Error("GOP-dossier niet gevonden");

    const obligation = await ObligationService.ensurePrincipalDebtObligation(
      legalProcess.debtClaimId,
      Number(legalProcess.debtClaim.principalAmount),
    );

    const tenantId = legalProcess.debtClaim.tenantId;
    const sanitizedName = `${crypto.randomUUID()}-${data.fileName}`.replace(/\s+/g, "-");
    const folder = `${tenantId}/legal-processes/${legalProcessId}/payment-proofs`;
    const storageKey = await StorageService.uploadFile(folder, sanitizedName, data.mimeType, data.buffer);

    const payment = await prisma.payment.create({
      data: {
        tenant_id: tenantId,
        obligation_id: obligation.id,
        total_amount: data.amount,
        // Solo se marca "paid" cuando la otra parte confirma — ver
        // confirmGopPayment. Hasta entonces no se aplica al saldo.
        status: "pending",
        method: "TRANSFER",
        payment_type: PaymentType.DEBT_PAYMENT,
        reference_number: `gop_payment_${legalProcess.id}_${Date.now()}`,
      },
    });

    const confirmation = await prisma.gopPaymentConfirmation.create({
      data: {
        legalProcessId,
        paymentId: payment.id,
        status: "AWAITING_CONFIRMATION",
        receivedBy: data.receivedBy,
        recordedById: actorUserId,
        proofStorageKey: storageKey,
        proofOriginalName: data.fileName,
        proofMimeType: data.mimeType,
        proofSize: data.size,
      },
    });

    const receivedByLabel = data.receivedBy === "BAILIFF" ? "de deurwaarder" : "de deelnemer";
    await ClaimTimelineService.logEvent(
      legalProcess.debtClaimId,
      "PAYMENT_REGISTERED",
      `Betaling van ${data.amount} geregistreerd (ontvangen door ${receivedByLabel}). In afwachting van bevestiging door de andere partij.`,
      { paymentId: payment.id, confirmationId: confirmation.id, amount: data.amount, receivedBy: data.receivedBy },
      actorUserId,
    );

    const notification = {
      type: NotificationType.GOP_PAYMENT_AWAITING_CONFIRMATION,
      title: "Betaling ter bevestiging",
      message: `Er werd een betaling van ${data.amount} geregistreerd in dossier ${legalProcess.debtClaim.reference}, ontvangen door ${
        data.receivedBy === "BAILIFF" ? "de deurwaarder" : "de deelnemer"
      }. Controleer het bewijs en bevestig of betwist de betaling.`,
      link: `/legal-processes/${legalProcessId}`,
      entity_type: "GopPaymentConfirmation",
      entity_id: confirmation.id,
    };

    if (data.receivedBy === "PARTICIPANT") {
      if (legalProcess.bailiff.user_id) {
        await NotificationService.create({
          tenant_id: tenantId,
          user_id: legalProcess.bailiff.user_id,
          ...notification,
        });
      }
    } else {
      await NotificationService.notifyTenantStaff(tenantId, notification);
    }

    return confirmation;
  };

  static getPaymentConfirmations = async (legalProcessId: string) => {
    const items = await prisma.gopPaymentConfirmation.findMany({
      where: { legalProcessId },
      include: { payment: true },
      orderBy: { createdAt: "desc" },
    });
    // Decimal no cruza de un Server Action a un Client Component.
    return items.map((item) => ({
      ...item,
      payment: { ...item.payment, total_amount: Number(item.payment.total_amount) },
    }));
  };

  static getPaymentConfirmationById = async (id: string) => {
    return prisma.gopPaymentConfirmation.findUnique({
      where: { id },
      include: this.paymentConfirmationInclude,
    });
  };

  // La parte que NO recibió el pago (según receivedBy) lo confirma. Recién
  // acá se marca el Payment como pagado y se aplica al saldo.
  static confirmGopPayment = async (confirmationId: string, actorUserId?: string) => {
    const confirmation = await prisma.gopPaymentConfirmation.findUnique({
      where: { id: confirmationId },
      include: this.paymentConfirmationInclude,
    });
    if (!confirmation) throw new Error("Betalingsregistratie niet gevonden.");
    if (!["AWAITING_CONFIRMATION", "CORRECTED"].includes(confirmation.status)) {
      throw new Error(`Deze betaling kan niet bevestigd worden in de status ${confirmation.status}.`);
    }

    await prisma.payment.update({
      where: { id: confirmation.paymentId },
      data: { status: "paid", paid_at: new Date() },
    });
    const updatedObligation = await ObligationService.applyPayment(confirmation.paymentId);

    const updated = await prisma.gopPaymentConfirmation.update({
      where: { id: confirmationId },
      data: { status: "CONFIRMED", confirmedById: actorUserId, confirmedAt: new Date() },
    });

    const legalProcess = confirmation.legalProcess;
    await ClaimTimelineService.logEvent(
      legalProcess.debtClaimId,
      "PAYMENT_VERIFIED",
      `Betaling van ${Number(confirmation.payment.total_amount)} bevestigd door de andere partij. Nieuw saldo: ${updatedObligation.balanceAmount}.`,
      { paymentId: confirmation.paymentId, balanceAmount: Number(updatedObligation.balanceAmount) },
      actorUserId,
    );

    const recordedUserId = confirmation.recordedById;
    if (recordedUserId) {
      await NotificationService.create({
        tenant_id: legalProcess.debtClaim.tenantId,
        user_id: recordedUserId,
        type: NotificationType.GOP_PAYMENT_CONFIRMED,
        title: "Betaling bevestigd",
        message: `Jouw betalingsregistratie voor dossier ${legalProcess.debtClaim.reference} werd bevestigd.`,
        link: `/legal-processes/${legalProcess.id}`,
        entity_type: "GopPaymentConfirmation",
        entity_id: updated.id,
      });
    }

    await this.checkAndCloseIfSettled(legalProcess.debtClaimId, actorUserId);

    return { confirmation: updated, obligation: updatedObligation };
  };

  // La parte que NO recibió el pago no lo reconoce (monto o comprobante
  // incorrecto). No se aplica nada al saldo.
  static disputeGopPayment = async (confirmationId: string, reason: string, actorUserId?: string) => {
    const confirmation = await prisma.gopPaymentConfirmation.findUnique({
      where: { id: confirmationId },
      include: this.paymentConfirmationInclude,
    });
    if (!confirmation) throw new Error("Betalingsregistratie niet gevonden.");
    if (!["AWAITING_CONFIRMATION", "CORRECTED"].includes(confirmation.status)) {
      throw new Error(`Deze betaling kan niet betwist worden in de status ${confirmation.status}.`);
    }

    const updated = await prisma.gopPaymentConfirmation.update({
      where: { id: confirmationId },
      data: {
        status: "DISPUTED",
        disputeReason: reason,
        disputedById: actorUserId,
        disputedAt: new Date(),
      },
    });

    const legalProcess = confirmation.legalProcess;
    await ClaimTimelineService.logEvent(
      legalProcess.debtClaimId,
      "PAYMENT_REJECTED",
      `Betaling van ${Number(confirmation.payment.total_amount)} betwist: ${reason}`,
      { paymentId: confirmation.paymentId, reason },
      actorUserId,
    );

    const recordedUserId = confirmation.recordedById;
    if (recordedUserId) {
      await NotificationService.create({
        tenant_id: legalProcess.debtClaim.tenantId,
        user_id: recordedUserId,
        type: NotificationType.GOP_PAYMENT_DISPUTED,
        title: "Betaling betwist",
        message: `Jouw betalingsregistratie voor dossier ${legalProcess.debtClaim.reference} werd betwist: ${reason}. Je kunt dit corrigeren.`,
        link: `/legal-processes/${legalProcess.id}`,
        entity_type: "GopPaymentConfirmation",
        entity_id: updated.id,
      });
    }

    return updated;
  };

  // Solo quien registró originalmente el pago puede corregirlo, y solo
  // tras una disputa. Vuelve a quedar a la espera de confirmación.
  static correctGopPayment = async (
    confirmationId: string,
    data: {
      amount?: number;
      note?: string;
      fileName?: string;
      mimeType?: string;
      size?: number;
      buffer?: Buffer;
    },
    actorUserId?: string,
  ) => {
    const confirmation = await prisma.gopPaymentConfirmation.findUnique({
      where: { id: confirmationId },
      include: this.paymentConfirmationInclude,
    });
    if (!confirmation) throw new Error("Betalingsregistratie niet gevonden.");
    if (confirmation.status !== "DISPUTED") {
      throw new Error("Alleen een betwiste betaling kan gecorrigeerd worden.");
    }
    if (actorUserId && confirmation.recordedById && confirmation.recordedById !== actorUserId) {
      throw new Error("Alleen wie de betaling oorspronkelijk registreerde kan deze corrigeren.");
    }

    if (data.amount !== undefined) {
      await prisma.payment.update({
        where: { id: confirmation.paymentId },
        data: { total_amount: data.amount },
      });
    }

    let proofUpdate: Record<string, unknown> = {};
    if (data.fileName && data.buffer && data.mimeType && data.size) {
      const legalProcess = confirmation.legalProcess;
      const sanitizedName = `${crypto.randomUUID()}-${data.fileName}`.replace(/\s+/g, "-");
      const folder = `${legalProcess.debtClaim.tenantId}/legal-processes/${legalProcess.id}/payment-proofs`;
      const storageKey = await StorageService.uploadFile(folder, sanitizedName, data.mimeType, data.buffer);
      proofUpdate = {
        proofStorageKey: storageKey,
        proofOriginalName: data.fileName,
        proofMimeType: data.mimeType,
        proofSize: data.size,
      };
    }

    const updated = await prisma.gopPaymentConfirmation.update({
      where: { id: confirmationId },
      data: {
        status: "CORRECTED",
        correctionNote: data.note,
        correctedById: actorUserId,
        correctedAt: new Date(),
        ...proofUpdate,
      },
    });

    const legalProcess = confirmation.legalProcess;
    await ClaimTimelineService.logEvent(
      legalProcess.debtClaimId,
      "STATUS_CHANGED",
      `Betaling gecorrigeerd na betwisting.${data.note ? ` ${data.note}` : ""} Opnieuw in afwachting van bevestiging.`,
      { paymentId: confirmation.paymentId, amount: data.amount ?? null },
      actorUserId,
    );

    const counterpartNotification = {
      type: NotificationType.GOP_PAYMENT_CORRECTED,
      title: "Betaling gecorrigeerd",
      message: `De betwiste betalingsregistratie voor dossier ${legalProcess.debtClaim.reference} werd gecorrigeerd. Controleer deze opnieuw.`,
      link: `/legal-processes/${legalProcess.id}`,
      entity_type: "GopPaymentConfirmation",
      entity_id: updated.id,
    };

    if (confirmation.receivedBy === "PARTICIPANT") {
      if (legalProcess.bailiff.user_id) {
        await NotificationService.create({
          tenant_id: legalProcess.debtClaim.tenantId,
          user_id: legalProcess.bailiff.user_id,
          ...counterpartNotification,
        });
      }
    } else {
      await NotificationService.notifyTenantStaff(legalProcess.debtClaim.tenantId, counterpartNotification);
    }

    return updated;
  };
}
