import { prisma } from "@/lib/prisma";
import { Agreement, CreateAgreement, AgreementResponse } from "@/modules/agreement/services/agreement.validators";
import { AgreementStatus } from "@/modules/agreement/constants/agreement-status";
import { InstallmentStatus } from "@/modules/agreement/constants/installment-status";
import { NotificationService } from "@/modules/notification/services/notification.service";
import { NotificationType } from "@/modules/notification/constants/notification-type";
import { BlockadeService } from "@/modules/blockade/services/blockade.service";
import { formatCurrency } from "@/shared/utils/formatters";

type PaymentAgreementFilter = {
  debtClaim_id?: string;
  tenant_id?: string;
  status?: AgreementStatus;
  debtor_id?: string;
};

const mapAgreementResponse = (a: any): AgreementResponse => ({
  id: a.id,
  tenant_id: a.tenant_id,
  debtClaim_id: a.debtClaim_id,
  debtClaim_reference: a.debtClaim?.reference ?? undefined,
  total_amount: Number(a.total_amount),
  installment_amount: Number(a.installment_amount),
  installments_count: a.installments_count,
  start_date: a.start_date,
  end_date: a.end_date,
  status: String(a.status),
  created_at: a.created_at ?? undefined,
  updated_at: a.updated_at ?? undefined,
  debtor_id: a.debtor_id ?? undefined,
  comment: a.comment ?? undefined,
  rejection_reason: a.rejection_reason ?? undefined,
  debtor: a.debtor
    ? {
        id: a.debtor.id,
        fullname:
          `${a.debtor.person?.first_name ?? ""} ${a.debtor.person?.last_name ?? ""}`.trim() ||
          a.debtor.person?.business_name ||
          "",
        email: a.debtor.email ?? undefined,
        phone: a.debtor.person?.phone ?? undefined,
        personal_number: a.debtor.person?.personal_number ?? undefined,
      }
    : undefined,
});

export class AgreementService {
  static async getAll(filter?: Partial<PaymentAgreementFilter>): Promise<AgreementResponse[]> {
    const agreements = await prisma.agreement.findMany({
      where: { ...filter },
      include: { debtor: { include: { person: true } }, debtClaim: true },
    });
    return agreements.map(mapAgreementResponse);
  }

  static async create(
    tenant_id: string,
    data: CreateAgreement,
    requestingUserId?: string,
  ) {
    const debtClaim = await prisma.debtClaim.findUnique({
      where: { id: data.debtClaim_id },
      include: { debtor: true },
    });

    if (!debtClaim || debtClaim.tenantId !== tenant_id) {
      throw new Error("DebtClaim not found for this tenant");
    }

    if (requestingUserId && debtClaim.debtor.user_id !== requestingUserId) {
      throw new Error("No tiene permiso para solicitar un acuerdo sobre esta deuda");
    }

    if (data.debtor_id && data.debtor_id !== debtClaim.debtorId) {
      throw new Error("El debtor_id no coincide con la deuda indicada");
    }

    // El deudor sólo puede solicitar un acuerdo mientras el AOP siga dentro
    // de su plazo de reacción. Sólo el primer paso (Aanmaning) persiste hoy
    // un deadline real; si un paso posterior no tiene deadline registrado,
    // se permite (no se penaliza al deudor por un dato faltante).
    const aop = await prisma.administrativeCollection.findUnique({
      where: { debtClaimId: data.debtClaim_id },
      include: { steps: { orderBy: { id: "desc" }, take: 1 } },
    });
    const latestDeadline = aop?.steps[0]?.deadline;
    if (latestDeadline && new Date() > latestDeadline) {
      throw new Error(
        "De reactietermijn voor dit dossier is verstreken. U kunt geen nieuwe betalingsregeling meer aanvragen.",
      );
    }

    const [pendingCount, acceptedCount] = await Promise.all([
      prisma.agreement.count({
        where: {
          debtClaim_id: data.debtClaim_id,
          status: { in: [AgreementStatus.PENDING, AgreementStatus.IN_NEGOTIATION, AgreementStatus.COUNTEROFFER] },
        },
      }),
      prisma.agreement.count({
        where: { debtClaim_id: data.debtClaim_id, status: AgreementStatus.ACCEPTED },
      }),
    ]);

    if (pendingCount > 0) {
      throw new Error(
        "Er is al een betalingsregeling in behandeling voor dit dossier. Wacht tot deze is beoordeeld.",
      );
    }

    if (acceptedCount > 0) {
      throw new Error("Er bestaat al een goedgekeurde betalingsregeling voor dit dossier.");
    }

    const newAgreement = await prisma.agreement.create({
      data: {
        tenant_id,
        debtClaim_id: data.debtClaim_id,
        total_amount: data.total_amount,
        installment_amount: data.installment_amount,
        installments_count: data.installments_count,
        start_date: data.start_date,
        end_date: data.end_date,
        status: AgreementStatus.PENDING,
        debtor_id: data.debtor_id,
        comment: data.comment || null,
      },
    });

    for (let i = 0; i < data.installments_count; i++) {
      const installmentDate = new Date(data.start_date);
      installmentDate.setMonth(installmentDate.getMonth() + i);
      await prisma.agreementInstallment.create({
        data: {
          agreement_id: newAgreement.id,
          number: i + 1,
          due_date: installmentDate,
          amount: data.installment_amount,
          status: InstallmentStatus.PENDING,
        },
      });
    }

    // Cada creación pasa por este método sólo cuando la solicita el propio
    // deudor (ver el chequeo requestingUserId más arriba); el personal usa
    // update() para contraofertas. Por eso siempre se notifica al tenant.
    try {
      await NotificationService.notifyTenantStaff(
        tenant_id,
        {
          type: NotificationType.AGREEMENT_PENDING_REVIEW,
          title: "Nieuw voorstel betalingsregeling",
          message: `Er is een nieuwe betalingsregeling aangevraagd van ${formatCurrency(
            Number(data.total_amount),
          )} over ${data.installments_count} termijnen (dossier ${debtClaim.reference || debtClaim.id}). Beoordeel het voorstel.`,
          link: `/agreements?open=${newAgreement.id}`,
          entity_type: "Agreement",
          entity_id: newAgreement.id,
        },
        { excludeUserId: requestingUserId },
      );
    } catch (error) {
      console.error("Error notifying tenant staff of new agreement request:", error);
    }

    return {
      id: newAgreement.id,
      debtClaim_id: newAgreement.debtClaim_id,
      total_amount: Number(newAgreement.total_amount),
      installment_amount: Number(newAgreement.installment_amount),
      installments_count: newAgreement.installments_count,
      start_date: newAgreement.start_date,
      status: String(newAgreement.status),
      created_at: newAgreement.created_at ?? undefined,
      updated_at: newAgreement.updated_at ?? undefined,
      debtor_id: newAgreement.debtor_id ?? undefined,
    };
  }

  static async delete(id: string) {
    await prisma.agreementInstallment.deleteMany({ where: { agreement_id: id } });
    return prisma.agreement.delete({ where: { id } });
  }

  static async update(id: string, data: Partial<Agreement>) {
    const updateData: any = {};
    if (data.total_amount !== undefined) updateData.total_amount = data.total_amount;
    if (data.installment_amount !== undefined) updateData.installment_amount = data.installment_amount;
    if (data.installments_count !== undefined) updateData.installments_count = data.installments_count;
    if (data.start_date !== undefined) updateData.start_date = data.start_date;
    if (data.status !== undefined) updateData.status = data.status as unknown as AgreementStatus;
    if (data.debtor_id !== undefined) updateData.debtor_id = data.debtor_id ?? null;
    if (data.comment !== undefined) updateData.comment = data.comment ?? "";
    if (data.rejection_reason !== undefined) updateData.rejection_reason = data.rejection_reason ?? null;

    // El deudor debe poder saber por qué se rechazó su solicitud y ajustarla
    // en consecuencia; sin motivo obligatorio el rechazo queda sin contexto.
    if (updateData.status === AgreementStatus.REJECTED && !updateData.rejection_reason?.trim()) {
      throw new Error("Debe indicar un motivo de rechazo.");
    }

    const updated = await prisma.agreement.update({ where: { id }, data: updateData });

    if (
      updateData.status &&
      [
        AgreementStatus.ACCEPTED,
        AgreementStatus.REJECTED,
        AgreementStatus.COUNTEROFFER,
      ].includes(updateData.status)
    ) {
      await this.notifyDebtorOfDecision(updated);
    }

    if (updateData.status === AgreementStatus.ACCEPTED) {
      await this.suspendBlockadeIfAny(updated);
    }

    if (updateData.installments_count) {
      await prisma.agreementInstallment.deleteMany({ where: { agreement_id: id } });
      for (let i = 0; i < updateData.installments_count; i++) {
        const d = new Date(updateData.start_date || updated.start_date);
        d.setMonth(d.getMonth() + i);
        await prisma.agreementInstallment.create({
          data: {
            agreement_id: id,
            number: i + 1,
            due_date: d,
            amount: Number(updateData.installment_amount),
            status: InstallmentStatus.PENDING,
          },
        });
      }
    }

    return {
      id: updated.id,
      debtClaim_id: updated.debtClaim_id,
      total_amount: Number(updated.total_amount),
      installment_amount: Number(updated.installment_amount),
      installments_count: updated.installments_count,
      start_date: updated.start_date,
      status: String(updated.status),
      created_at: updated.created_at ?? undefined,
      updated_at: updated.updated_at ?? undefined,
      debtor_id: updated.debtor_id ?? undefined,
      rejection_reason: updated.rejection_reason ?? undefined,
    };
  }

  // Informa al deudor la decisión del tenant sobre su solicitud; sin
  // notificación el deudor sólo se entera si vuelve a consultar la página.
  static async notifyDebtorOfDecision(agreement: {
    id: string;
    tenant_id: string;
    debtor_id: string | null;
    status: string;
    rejection_reason?: string | null;
  }): Promise<void> {
    if (!agreement.debtor_id) return;

    const debtor = await prisma.debtor.findUnique({ where: { id: agreement.debtor_id } });
    if (!debtor?.user_id) return;

    const copy: Record<string, { type: NotificationType; title: string; message: string }> = {
      [AgreementStatus.ACCEPTED]: {
        type: NotificationType.AGREEMENT_ACCEPTED,
        title: "Betalingsregeling goedgekeurd",
        message: "Uw voorstel voor een betalingsregeling is goedgekeurd.",
      },
      [AgreementStatus.REJECTED]: {
        type: NotificationType.AGREEMENT_REJECTED,
        title: "Betalingsregeling afgewezen",
        message: `Uw voorstel voor een betalingsregeling is afgewezen. Reden: ${agreement.rejection_reason}. U kunt een nieuw voorstel indienen dat hiermee rekening houdt.`,
      },
      [AgreementStatus.COUNTEROFFER]: {
        type: NotificationType.AGREEMENT_COUNTEROFFER,
        title: "Tegenvoorstel ontvangen",
        message: "De deelnemer heeft een tegenvoorstel gedaan voor uw betalingsregeling. Bekijk en reageer.",
      },
    };

    const entry = copy[agreement.status];
    if (!entry) return;

    try {
      await NotificationService.create({
        tenant_id: agreement.tenant_id,
        user_id: debtor.user_id,
        type: entry.type,
        title: entry.title,
        message: entry.message,
        link: "/agreements",
        entity_type: "Agreement",
        entity_id: agreement.id,
      });
    } catch (error) {
      console.error("Error notifying debtor of agreement decision:", error);
    }
  }

  // Un acuerdo aceptado con este tenant justifica levantar temporalmente su
  // bloqueo económico mientras lo cumpla; si luego incumple, el job de
  // reactivación (lib/jobs/check_blockade_reactivation.ts) lo revierte.
  static async suspendBlockadeIfAny(agreement: {
    id: string;
    tenant_id: string;
    debtor_id: string | null;
  }): Promise<void> {
    if (!agreement.debtor_id) return;

    try {
      const suspended = await BlockadeService.suspendActiveForDebtor(
        agreement.debtor_id,
        agreement.tenant_id,
      );
      if (suspended.length === 0) return;

      const debtor = await prisma.debtor.findUnique({ where: { id: agreement.debtor_id } });
      if (!debtor?.user_id) return;

      await NotificationService.create({
        tenant_id: agreement.tenant_id,
        user_id: debtor.user_id,
        type: NotificationType.BLOCKADE_SUSPENDED,
        title: "Economische blokkade tijdelijk opgeheven",
        message:
          "Uw betalingsregeling is goedgekeurd en uw economische blokkade is tijdelijk opgeheven. Bij het niet nakomen van de termijnen wordt de blokkade automatisch weer geactiveerd.",
        link: "/agreements",
        entity_type: "Agreement",
        entity_id: agreement.id,
      });
    } catch (error) {
      console.error("Error suspending blockade for accepted agreement:", error);
    }
  }

  static async existsAccepted(debtClaim_id: string): Promise<boolean> {
    const count = await prisma.agreement.count({
      where: { debtClaim_id, status: AgreementStatus.ACCEPTED },
    });
    return count > 0;
  }

  static async getById(id: string): Promise<Agreement | null> {
    const a = await prisma.agreement.findUnique({ where: { id } });
    if (!a) return null;
    return {
      id: a.id,
      debtClaim_id: a.debtClaim_id,
      tenant_id: a.tenant_id,
      total_amount: Number(a.total_amount),
      installment_amount: Number(a.installment_amount),
      installments_count: a.installments_count,
      start_date: a.start_date,
      end_date: a.end_date,
      status: String(a.status),
      created_at: a.created_at ?? undefined,
      updated_at: a.updated_at ?? undefined,
      debtor_id: a.debtor_id ?? undefined,
    };
  }

  static async getResponseById(id: string): Promise<AgreementResponse | null> {
    const a = await prisma.agreement.findUnique({
      where: { id },
      include: { debtor: { include: { person: true } }, debtClaim: true },
    });
    return a ? mapAgreementResponse(a) : null;
  }

  static async countByClaimId(debtClaim_id: string): Promise<number> {
    return prisma.agreement.count({ where: { debtClaim_id } });
  }

  static async getInstallmentsByAgreementId(agreement_id: string) {
    const installments = await prisma.agreementInstallment.findMany({
      where: { agreement_id },
    });
    return installments.map((i: any) => ({
      id: i.id,
      agreement_id: i.agreement_id,
      number: i.number,
      due_date: i.due_date,
      amount: Number(i.amount),
      status: String(i.status),
      created_at: i.created_at ?? undefined,
      updated_at: i.updated_at ?? undefined,
    }));
  }

  static async hasAccepted(debtClaim_id: string): Promise<boolean> {
    try {
      const a = await prisma.agreement.findFirst({
        where: { debtClaim_id, status: AgreementStatus.ACCEPTED },
      });
      return !!a;
    } catch {
      return false;
    }
  }

  static async hasPaymentsUpToDate(debtClaim_id: string): Promise<boolean> {
    try {
      const a = await prisma.agreement.findFirst({
        where: { debtClaim_id, status: AgreementStatus.ACCEPTED },
        include: { installments: true },
      });
      if (!a) return false;
      const today = new Date();
      for (const inst of a.installments) {
        if (inst.due_date <= today && inst.status !== InstallmentStatus.PAID) {
          return false;
        }
      }
      return true;
    } catch {
      return false;
    }
  }

  static async cancelByClaim(debtClaim_id: string) {
    return prisma.agreement.updateMany({
      where: { debtClaim_id, status: AgreementStatus.ACCEPTED },
      data: { status: AgreementStatus.CANCELLED },
    });
  }

  static async getAllByDebtClaimId(debtClaim_id: string): Promise<AgreementResponse[]> {
    const agreements = await prisma.agreement.findMany({
      where: { debtClaim_id },
      include: { debtor: { include: { person: true } }, debtClaim: true },
    });
    return agreements.map(mapAgreementResponse);
  }

  // Prioriza el acuerdo ACCEPTED (el único vinculante); si no hay uno,
  // devuelve la solicitud más reciente (útil para mostrar el estado "en
  // revisión" mientras se espera la aprobación del tenant).
  static async getByDebtClaimId(debtClaim_id: string): Promise<AgreementResponse | null> {
    const accepted = await prisma.agreement.findFirst({
      where: { debtClaim_id, status: AgreementStatus.ACCEPTED },
      include: { debtor: { include: { person: true } }, debtClaim: true },
    });
    if (accepted) return mapAgreementResponse(accepted);

    const latest = await prisma.agreement.findFirst({
      where: { debtClaim_id },
      orderBy: { created_at: "desc" },
      include: { debtor: { include: { person: true } }, debtClaim: true },
    });
    return latest ? mapAgreementResponse(latest) : null;
  }
}
