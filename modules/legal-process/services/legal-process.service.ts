import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import {
  TransferToLawyerInput,
  RegisterVerdictInput,
  RegisterExecutionMeasureInput,
  RegisterInterestUpdateInput,
  RegisterBailiffCostInput,
  MarkInactiveInput,
  ChangeBailiffInput,
  CancelLegalProcessInput,
} from "@/modules/legal-process/services/legal-process.validators";
import {
  GOP_FEE_RATE,
  LegalProcessStatus,
  VERDICT_REGISTRABLE_STATUSES,
  GOP_OPERABLE_STATUSES,
} from "@/modules/legal-process/constants/legal-process-status";
import { ClaimTimelineService } from "@/modules/collection/services/claim-timeline.service";
import { DebtFineService } from "@/modules/collection/services/debt-fine.service";
import { BlockadeService } from "@/modules/blockade/services/blockade.service";
import { NotificationService } from "@/modules/notification/services/notification.service";
import { NotificationType } from "@/modules/notification/constants/notification-type";
import { BillingInvoiceService } from "@/modules/payment/services/billing-invoice.service";
import { sendInvoiceEmail } from "@/modules/payment/services/payment-mail.service";
import { PaymentService } from "@/modules/payment/services/payment.service";
import { PaymentType } from "@/modules/payment/services/payment.validators";
import { ParameterService } from "@/modules/settings/services/parameter/parameter.service";

const legalProcessInclude = {
  debtClaim: { include: { debtor: { include: { person: true }, }, tenant: true } },
  lawyer: true,
  bailiff: true,
  verdicts: true,
} satisfies Prisma.LegalProcessInclude;

export class LegalProcessService {
  static generateReferenceNumber = async () => {
    const year = new Date().getFullYear();
    const total = await prisma.legalProcess.count();
    return `GOP-${year}-${String(total + 1).padStart(3, "0")}`;
  };

  static getById = async (id: string) => {
    return prisma.legalProcess.findUnique({
      where: { id },
      include: legalProcessInclude,
    });
  };

  static getByDebtClaimId = async (debtClaimId: string) => {
    return prisma.legalProcess.findUnique({
      where: { debtClaimId },
      include: legalProcessInclude,
    });
  };

  static getForLawyerUser = async (userId: string) => {
    return prisma.legalProcess.findMany({
      where: { lawyer: { userId } },
      include: legalProcessInclude,
      orderBy: { startedAt: "desc" },
    });
  };

  static getForBailiffUser = async (userId: string) => {
    return prisma.legalProcess.findMany({
      where: { bailiff: { user_id: userId } },
      include: legalProcessInclude,
      orderBy: { startedAt: "desc" },
    });
  };

  static getAllForTenant = async (tenantId: string) => {
    return prisma.legalProcess.findMany({
      where: { debtClaim: { tenantId } },
      include: legalProcessInclude,
      orderBy: { startedAt: "desc" },
    });
  };

  // ---------------------------------------------------------------------
  // 1-2. Transferencia al seguimiento judicial y aceptación del abogado
  // ---------------------------------------------------------------------

  static transferToLawyer = async (input: TransferToLawyerInput, actorUserId?: string) => {
    const debtClaim = await prisma.debtClaim.findUnique({ where: { id: input.debtClaimId } });
    if (!debtClaim) throw new Error("Expediente (DebtClaim) no encontrado");

    // El GOP es el último escalón: solo se habilita cuando la fase del AOP
    // de este expediente llegó a BLK_NOTIFICATION ("Blokkade"). No alcanza
    // con que exista un Blockade activo en general (podría venir de otro
    // origen, p.ej. un bloqueo registrado directo vía /blocks) — tiene que
    // ser la fase actual de ESTE AOP.
    const aop = await prisma.administrativeCollection.findUnique({
      where: { debtClaimId: input.debtClaimId },
      include: { steps: { orderBy: { id: "desc" }, take: 1 } },
    });
    if (aop?.steps[0]?.step !== "BLK_NOTIFICATION") {
      throw new Error(
        "Het dossier kan alleen worden overgedragen aan gerechtelijke opvolging als de AOP-fase Blokkade is.",
      );
    }

    // Siempre se transfiere a UNA sola parte: abogado o alguacil, nunca
    // ambos (validado también en TransferToLawyerSchema).
    let lawyer: Prisma.LawyerGetPayload<{}> | null = null;
    let bailiff: Prisma.BailiffGetPayload<{}> | null = null;

    if (input.lawyerId) {
      lawyer = await prisma.lawyer.findUnique({ where: { id: input.lawyerId } });
      if (!lawyer) throw new Error("Abogado no encontrado");
    } else if (input.bailiffId) {
      bailiff = await prisma.bailiff.findUnique({ where: { id: input.bailiffId } });
      if (!bailiff) throw new Error("Alguacil no encontrado");
    } else {
      throw new Error("Selecteer een advocaat of een deurwaarder.");
    }

    const existing = await prisma.legalProcess.findUnique({
      where: { debtClaimId: input.debtClaimId },
    });

    const legalProcess = existing
      ? await prisma.legalProcess.update({
          where: { id: existing.id },
          data: {
            lawyerId: input.lawyerId ?? null,
            bailiffId: input.bailiffId ?? null,
            status: LegalProcessStatus.PENDING_ACCEPTANCE,
            rejectionReason: null,
          },
        })
      : await prisma.legalProcess.create({
          data: {
            debtClaimId: input.debtClaimId,
            lawyerId: input.lawyerId ?? null,
            bailiffId: input.bailiffId ?? null,
            status: LegalProcessStatus.PENDING_ACCEPTANCE,
            startedAt: new Date(),
          },
        });

    const assignedLabel = lawyer
      ? `abogado ${lawyer.firstName} ${lawyer.lastName}`
      : `alguacil ${bailiff!.fullname}`;

    await ClaimTimelineService.logEvent(
      input.debtClaimId,
      "GOP_STARTED",
      `Expediente transferido al ${assignedLabel}`,
      { lawyerId: lawyer?.id ?? null, bailiffId: bailiff?.id ?? null },
      actorUserId,
    );

    const assignedUserId = lawyer?.userId ?? bailiff?.user_id;
    if (assignedUserId) {
      await NotificationService.create({
        tenant_id: debtClaim.tenantId,
        user_id: assignedUserId,
        type: NotificationType.LEGAL_PROCESS_TRANSFER_REQUEST,
        title: "Nuevo expediente para seguimiento judicial",
        message: `Se te transfirió el expediente ${debtClaim.reference} para su seguimiento judicial.`,
        link: `/legal-processes/${legalProcess.id}`,
        entity_type: "LegalProcess",
        entity_id: legalProcess.id,
      });
    }

    return legalProcess;
  };

  static acceptTransfer = async (legalProcessId: string, actorUserId?: string) => {
    const legalProcess = await prisma.legalProcess.findUnique({
      where: { id: legalProcessId },
      include: { debtClaim: true },
    });
    if (!legalProcess) throw new Error("Expediente GOP no encontrado");
    if (legalProcess.status !== LegalProcessStatus.PENDING_ACCEPTANCE) {
      throw new Error("El expediente no está pendiente de aceptación");
    }

    const acceptedByLawyer = !!legalProcess.lawyerId;

    const updated = await prisma.legalProcess.update({
      where: { id: legalProcessId },
      data: { status: LegalProcessStatus.IN_PROCEDURE },
    });

    await ClaimTimelineService.logEvent(
      legalProcess.debtClaimId,
      acceptedByLawyer ? "LAWYER_ASSIGNED" : "BAILIFF_ASSIGNED",
      `El ${acceptedByLawyer ? "abogado" : "alguacil"} aceptó el expediente. Procedimiento judicial en curso.`,
      undefined,
      actorUserId,
    );

    await NotificationService.notifyTenantStaff(
      legalProcess.debtClaim.tenantId,
      {
        type: NotificationType.LEGAL_PROCESS_ACCEPTED,
        title: "Expediente aceptado",
        message: `El ${acceptedByLawyer ? "abogado" : "alguacil"} aceptó el expediente ${legalProcess.debtClaim.reference}.`,
        link: `/legal-processes/${legalProcess.id}`,
        entity_type: "LegalProcess",
        entity_id: legalProcess.id,
      },
      { excludeUserId: actorUserId },
    );

    return updated;
  };

  static rejectTransfer = async (
    legalProcessId: string,
    reason: string,
    actorUserId?: string,
  ) => {
    const legalProcess = await prisma.legalProcess.findUnique({
      where: { id: legalProcessId },
      include: { debtClaim: true },
    });
    if (!legalProcess) throw new Error("Expediente GOP no encontrado");
    if (legalProcess.status !== LegalProcessStatus.PENDING_ACCEPTANCE) {
      throw new Error("El expediente no está pendiente de aceptación");
    }

    const rejectedByLawyer = !!legalProcess.lawyerId;

    const updated = await prisma.legalProcess.update({
      where: { id: legalProcessId },
      data: {
        status: LegalProcessStatus.REJECTED,
        rejectionReason: reason,
        lawyerId: null,
        bailiffId: null,
      },
    });

    await ClaimTimelineService.logEvent(
      legalProcess.debtClaimId,
      "STATUS_CHANGED",
      `El ${rejectedByLawyer ? "abogado" : "alguacil"} rechazó el expediente: ${reason}`,
      undefined,
      actorUserId,
    );

    await NotificationService.notifyTenantStaff(legalProcess.debtClaim.tenantId, {
      type: NotificationType.LEGAL_PROCESS_REJECTED,
      title: "Expediente rechazado",
      message: `El ${rejectedByLawyer ? "abogado" : "alguacil"} rechazó el expediente ${legalProcess.debtClaim.reference}: ${reason}. Selecciona otro abogado o alguacil.`,
      link: `/legal-processes/${legalProcess.id}`,
      entity_type: "LegalProcess",
      entity_id: legalProcess.id,
    });

    return updated;
  };

  // ---------------------------------------------------------------------
  // 4-7. Registro de sentencia -> inicio automático del GOP
  // ---------------------------------------------------------------------

  static registerVerdict = async (
    data: RegisterVerdictInput,
    tenantId: string,
    actorUserId?: string,
  ) => {
    const legalProcess = await prisma.legalProcess.findUnique({
      where: { id: data.legalProcessId },
      include: { debtClaim: true },
    });
    if (!legalProcess) throw new Error("Expediente GOP no encontrado");
    if (!VERDICT_REGISTRABLE_STATUSES.includes(legalProcess.status as LegalProcessStatus)) {
      throw new Error(
        `Er kan geen vonnis worden geregistreerd in de status ${legalProcess.status}.`,
      );
    }

    const referenceNumber = legalProcess.referenceNumber ?? (await this.generateReferenceNumber());
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

      await tx.legalProcess.update({
        where: { id: legalProcess.id },
        data: {
          status: LegalProcessStatus.GOP_ACTIVE,
          referenceNumber,
          bailiffId: data.bailiff_id,
        },
      });

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
            startedById: actorUserId,
          },
        });
      }

      await tx.claimTimeline.create({
        data: {
          debtClaimId: legalProcess.debtClaimId,
          event: "VERDICT_REGISTERED",
          description: `Sentencia ${data.registration_number} registrada. GOP activado (${referenceNumber}).`,
          metadata: { verdictId: newVerdict.id, sentence_amount: data.sentence_amount, totalInterest },
          createdById: actorUserId,
        },
      });

      return { verdict: newVerdict };
    });

    await NotificationService.notifyTenantStaff(legalProcess.debtClaim.tenantId, {
      type: NotificationType.GOP_ACTIVATED,
      title: "GOP activado",
      message: `Se registró la sentencia del expediente ${legalProcess.debtClaim.reference}. El GOP está activo.`,
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
      `Medida de ejecución registrada: ${data.embargo_type}`,
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
      `Actualización de intereses (${data.interest.interest_type})`,
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
      `Costo definitivo del alguacil registrado: ${data.service_type}`,
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
  // 10-12. GOP Inactivo, control de plazos y reactivación automática
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
      `GOP marcado como Inactivo (${data.reason}). Revisión: ${data.reviewDate.toISOString()}`,
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
      "GOP reactivado automáticamente por registro de nueva medida de ejecución",
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
  // 13. Cambio de alguacil
  // ---------------------------------------------------------------------

  static changeBailiff = async (data: ChangeBailiffInput, actorUserId?: string) => {
    const legalProcess = await prisma.legalProcess.findUnique({
      where: { id: data.legalProcessId },
      include: { debtClaim: true },
    });
    if (!legalProcess) throw new Error("Expediente GOP no encontrado");
    if (
      [LegalProcessStatus.CLOSED, LegalProcessStatus.GOP_CANCELLED].includes(
        legalProcess.status as LegalProcessStatus,
      )
    ) {
      throw new Error("No se puede cambiar de alguacil en un expediente cerrado o cancelado");
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
      `Cambio de alguacil registrado`,
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
  // 14-15. Cancelación y cierre
  // ---------------------------------------------------------------------

  static cancel = async (data: CancelLegalProcessInput, actorUserId?: string) => {
    const legalProcess = await prisma.legalProcess.findUnique({
      where: { id: data.legalProcessId },
      include: { debtClaim: true, bailiff: true },
    });
    if (!legalProcess) throw new Error("Expediente GOP no encontrado");
    if (
      [LegalProcessStatus.CLOSED, LegalProcessStatus.GOP_CANCELLED].includes(
        legalProcess.status as LegalProcessStatus,
      )
    ) {
      throw new Error("El expediente ya está cerrado o cancelado");
    }

    const updated = await prisma.legalProcess.update({
      where: { id: legalProcess.id },
      data: {
        status: LegalProcessStatus.GOP_CANCELLED,
        cancelledAt: new Date(),
        cancelReason: data.reason,
      },
    });

    await prisma.claimService.updateMany({
      where: { debtClaimId: legalProcess.debtClaimId, service: "GOP" },
      data: { status: "CANCELLED", finishedAt: new Date(), finishedById: actorUserId },
    });

    await ClaimTimelineService.logEvent(
      legalProcess.debtClaimId,
      "STATUS_CHANGED",
      `GOP cancelado por el participante: ${data.reason}`,
      undefined,
      actorUserId,
    );

    await NotificationService.notifyTenantStaff(legalProcess.debtClaim.tenantId, {
      type: NotificationType.GOP_CANCELLED,
      title: "GOP cancelado",
      message: `El expediente ${legalProcess.debtClaim.reference} fue cancelado: ${data.reason}`,
      link: `/legal-processes/${legalProcess.id}`,
      entity_type: "LegalProcess",
      entity_id: legalProcess.id,
    });

    if (legalProcess.bailiff?.user_id) {
      await NotificationService.create({
        tenant_id: legalProcess.debtClaim.tenantId,
        user_id: legalProcess.bailiff.user_id,
        type: NotificationType.GOP_CANCELLED,
        title: "GOP cancelado",
        message: `El participante canceló la gestión judicial del expediente ${legalProcess.debtClaim.reference}.`,
        link: `/legal-processes/${legalProcess.id}`,
        entity_type: "LegalProcess",
        entity_id: legalProcess.id,
      });
    }

    return updated;
  };

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
      "Sentencia cumplida en su totalidad. Expediente GOP cerrado.",
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

  // Sección 9: cuando un pago deja saldadas todas las obligaciones del GOP,
  // el cierre debe efectuarse igual que si el alguacil lo cerrara a mano
  // (incluye el caso de la última cuota de un acuerdo de pago).
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

  // Usado por registerExecutionMeasure/registerInterestUpdate/registerBailiffCost:
  // las tres únicas operaciones que se registran contra un Verdict ya
  // existente, así que la validación de estado vive aquí una sola vez.
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
  // al participante — ver decisión de negocio en la Fase 1 del plan GOP.
  //
  // Sigue el patrón "payment intent" ya usado en PaymentService.create: el
  // Payment (pending) se crea ANTES de llamar a Sentoo, y la BillingInvoice
  // se crea DESPUÉS, apuntando a ese Payment real — así el webhook de Sentoo
  // (payment_id -> processGopFeePaymentConfirmed) puede reconciliar la
  // factura cuando el participante efectivamente paga (sección 6/8 del spec:
  // "después del pago, la factura se vincula al expediente GOP").
  //
  // Nunca deja que un fallo de facturación tumbe el registro de la sentencia
  // o del costo del alguacil que ya se guardó: se registra el error en el
  // audit trail para que el staff lo note y lo resuelva a mano.
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
  // Payment de tipo GOP se confirma como pagado. Cierra el ciclo del spec:
  // "después del pago, la factura se vincula al expediente GOP".
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
}
