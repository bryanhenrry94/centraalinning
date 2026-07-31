import { addDays, startOfDay } from "date-fns";
import { prisma } from "@/lib/prisma";
import { ClaimTimelineService } from "@/modules/collection/services/claim-timeline.service";
import { NotificationService } from "@/modules/notification/services/notification.service";
import { NotificationType } from "@/modules/notification/constants/notification-type";
import { LegalProcessStatus } from "@/modules/legal-process/constants/legal-process-status";

// Días de antelación para avisar del vencimiento de un plazo. Podría
// convertirse en un Parameter configurable si el negocio lo pide más
// adelante (como collection_fee_rate en Parameter).
const PRESCRIPTION_REMINDER_DAYS = 30;
const REVIEW_REMINDER_DAYS = 7;

async function alreadyNotifiedToday(entityId: string, type: NotificationType, today: Date) {
  const count = await prisma.notification.count({
    where: {
      entity_type: "LegalProcess",
      entity_id: entityId,
      type,
      created_at: { gte: today },
    },
  });
  return count > 0;
}

export async function checkGopDeadlines() {
  const today = startOfDay(new Date());
  let prescriptionReminders = 0;
  let reviewReminders = 0;

  // Sección 11: plazo de prescripción de expedientes GOP Activos.
  const verdictsAtRisk = await prisma.verdict.findMany({
    where: {
      prescription_due_date: { not: null, gte: today, lte: addDays(today, PRESCRIPTION_REMINDER_DAYS) },
      legal_process: { status: LegalProcessStatus.GOP_ACTIVE },
    },
    include: {
      legal_process: { include: { debtClaim: true, bailiff: true } },
    },
  });

  for (const verdict of verdictsAtRisk) {
    const legalProcess = verdict.legal_process;
    if (await alreadyNotifiedToday(legalProcess.id, NotificationType.GOP_PRESCRIPTION_REMINDER, today)) {
      continue;
    }

    const dueDate = verdict.prescription_due_date!.toLocaleDateString();
    const message = `El plazo de prescripción del expediente ${legalProcess.debtClaim.reference} vence el ${dueDate}. Registra nuevas medidas de ejecución a tiempo.`;

    if (legalProcess.bailiff?.user_id) {
      await NotificationService.create({
        tenant_id: legalProcess.debtClaim.tenantId,
        user_id: legalProcess.bailiff.user_id,
        type: NotificationType.GOP_PRESCRIPTION_REMINDER,
        title: "Plazo de prescripción próximo a vencer",
        message,
        link: `/legal-processes/${legalProcess.id}`,
        entity_type: "LegalProcess",
        entity_id: legalProcess.id,
      });
    }

    await NotificationService.notifyTenantStaff(legalProcess.debtClaim.tenantId, {
      type: NotificationType.GOP_PRESCRIPTION_REMINDER,
      title: "Plazo de prescripción próximo a vencer",
      message,
      link: `/legal-processes/${legalProcess.id}`,
      entity_type: "LegalProcess",
      entity_id: legalProcess.id,
    });

    await ClaimTimelineService.logEvent(
      legalProcess.debtClaimId,
      "NOTIFICATION_SENT",
      `Recordatorio de prescripción enviado (vence ${dueDate})`,
      { verdictId: verdict.id, prescription_due_date: verdict.prescription_due_date },
    );

    prescriptionReminders++;
  }

  // Sección 11: fecha de revisión de expedientes GOP Inactivos.
  const inactiveDue = await prisma.legalProcess.findMany({
    where: {
      status: LegalProcessStatus.GOP_INACTIVE,
      reviewDate: { lte: addDays(today, REVIEW_REMINDER_DAYS) },
    },
    include: { debtClaim: true, bailiff: true },
  });

  for (const legalProcess of inactiveDue) {
    if (await alreadyNotifiedToday(legalProcess.id, NotificationType.GOP_REVIEW_REMINDER, today)) {
      continue;
    }

    const reviewDate = legalProcess.reviewDate!.toLocaleDateString();
    const message = `El expediente ${legalProcess.debtClaim.reference} (GOP Inactivo) tiene fecha de revisión el ${reviewDate}. Evalúa si hay nuevas medidas de ejecución disponibles.`;

    if (legalProcess.bailiff?.user_id) {
      await NotificationService.create({
        tenant_id: legalProcess.debtClaim.tenantId,
        user_id: legalProcess.bailiff.user_id,
        type: NotificationType.GOP_REVIEW_REMINDER,
        title: "Revisión de GOP Inactivo pendiente",
        message,
        link: `/legal-processes/${legalProcess.id}`,
        entity_type: "LegalProcess",
        entity_id: legalProcess.id,
      });
    }

    await NotificationService.notifyTenantStaff(legalProcess.debtClaim.tenantId, {
      type: NotificationType.GOP_REVIEW_REMINDER,
      title: "Revisión de GOP Inactivo pendiente",
      message,
      link: `/legal-processes/${legalProcess.id}`,
      entity_type: "LegalProcess",
      entity_id: legalProcess.id,
    });

    await ClaimTimelineService.logEvent(
      legalProcess.debtClaimId,
      "NOTIFICATION_SENT",
      `Recordatorio de revisión de GOP Inactivo enviado (revisión ${reviewDate})`,
      { reviewDate: legalProcess.reviewDate },
    );

    reviewReminders++;
  }

  return {
    message: "Recordatorios de plazos GOP procesados",
    prescriptionReminders,
    reviewReminders,
  };
}
