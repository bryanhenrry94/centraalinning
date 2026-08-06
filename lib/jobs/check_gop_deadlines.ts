import { addDays, startOfDay } from "date-fns";
import { prisma } from "@/lib/prisma";
import { ClaimTimelineService } from "@/modules/collection/services/claim-timeline.service";
import { NotificationService } from "@/modules/notification/services/notification.service";
import { NotificationType } from "@/modules/notification/constants/notification-type";
import { LegalProcessStatus } from "@/modules/legal-process/constants/legal-process-status";
import { SettingsService } from "@/modules/settings/services/settings/settings.service";

// Valores por defecto — el Superadministrador configura la frecuencia real
// por isla/tenant editando los Settings gop_prescription_reminder_days /
// gop_review_reminder_days (punto 14 del análisis CFSB), sin tocar código.
const DEFAULT_PRESCRIPTION_REMINDER_DAYS = 30;
const DEFAULT_REVIEW_REMINDER_DAYS = 7;

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
  // Sin límite superior en la consulta: cada tenant/isla puede tener su
  // propia antelación configurada (Setting), así que el filtro exacto se
  // aplica en memoria por expediente.
  const verdictsAtRisk = await prisma.verdict.findMany({
    where: {
      prescription_due_date: { not: null, gte: today },
      legal_process: { status: LegalProcessStatus.GOP_ACTIVE },
    },
    include: {
      legal_process: { include: { debtClaim: { include: { tenant: true } }, bailiff: true } },
    },
  });

  for (const verdict of verdictsAtRisk) {
    const legalProcess = verdict.legal_process;
    const tenant = legalProcess.debtClaim.tenant;
    const prescriptionReminderDays = await SettingsService.resolveNumber(
      "gop_prescription_reminder_days",
      { tenantId: tenant.id, jurisdictionId: tenant.jurisdictionId },
      DEFAULT_PRESCRIPTION_REMINDER_DAYS,
    );
    if (verdict.prescription_due_date! > addDays(today, prescriptionReminderDays)) continue;

    if (await alreadyNotifiedToday(legalProcess.id, NotificationType.GOP_PRESCRIPTION_REMINDER, today)) {
      continue;
    }

    const dueDate = verdict.prescription_due_date!.toLocaleDateString();
    const message = `De verjaringstermijn van dossier ${legalProcess.debtClaim.reference} verstrijkt op ${dueDate}. Registreer op tijd nieuwe executiemaatregelen.`;

    if (legalProcess.bailiff?.user_id) {
      await NotificationService.create({
        tenant_id: legalProcess.debtClaim.tenantId,
        user_id: legalProcess.bailiff.user_id,
        type: NotificationType.GOP_PRESCRIPTION_REMINDER,
        title: "Verjaringstermijn verstrijkt binnenkort",
        message,
        link: `/legal-processes/${legalProcess.id}`,
        entity_type: "LegalProcess",
        entity_id: legalProcess.id,
      });
    }

    await NotificationService.notifyTenantStaff(legalProcess.debtClaim.tenantId, {
      type: NotificationType.GOP_PRESCRIPTION_REMINDER,
      title: "Verjaringstermijn verstrijkt binnenkort",
      message,
      link: `/legal-processes/${legalProcess.id}`,
      entity_type: "LegalProcess",
      entity_id: legalProcess.id,
    });

    await ClaimTimelineService.logEvent(
      legalProcess.debtClaimId,
      "NOTIFICATION_SENT",
      `Verjaringsherinnering verzonden (verstrijkt op ${dueDate})`,
      { verdictId: verdict.id, prescription_due_date: verdict.prescription_due_date },
    );

    prescriptionReminders++;
  }

  // Sección 11: fecha de revisión de expedientes GOP Inactivos. Sin límite
  // superior en la consulta por el mismo motivo que arriba.
  const inactiveDue = await prisma.legalProcess.findMany({
    where: {
      status: LegalProcessStatus.GOP_INACTIVE,
      reviewDate: { not: null },
    },
    include: { debtClaim: { include: { tenant: true } }, bailiff: true },
  });

  for (const legalProcess of inactiveDue) {
    const tenant = legalProcess.debtClaim.tenant;
    const reviewReminderDays = await SettingsService.resolveNumber(
      "gop_review_reminder_days",
      { tenantId: tenant.id, jurisdictionId: tenant.jurisdictionId },
      DEFAULT_REVIEW_REMINDER_DAYS,
    );
    if (legalProcess.reviewDate! > addDays(today, reviewReminderDays)) continue;

    if (await alreadyNotifiedToday(legalProcess.id, NotificationType.GOP_REVIEW_REMINDER, today)) {
      continue;
    }

    const reviewDate = legalProcess.reviewDate!.toLocaleDateString();
    const message = `Dossier ${legalProcess.debtClaim.reference} (GOP Inactief) heeft als beoordelingsdatum ${reviewDate}. Ga na of er nieuwe executiemaatregelen mogelijk zijn.`;

    if (legalProcess.bailiff?.user_id) {
      await NotificationService.create({
        tenant_id: legalProcess.debtClaim.tenantId,
        user_id: legalProcess.bailiff.user_id,
        type: NotificationType.GOP_REVIEW_REMINDER,
        title: "Beoordeling van Inactief GOP vereist",
        message,
        link: `/legal-processes/${legalProcess.id}`,
        entity_type: "LegalProcess",
        entity_id: legalProcess.id,
      });
    }

    await NotificationService.notifyTenantStaff(legalProcess.debtClaim.tenantId, {
      type: NotificationType.GOP_REVIEW_REMINDER,
      title: "Beoordeling van Inactief GOP vereist",
      message,
      link: `/legal-processes/${legalProcess.id}`,
      entity_type: "LegalProcess",
      entity_id: legalProcess.id,
    });

    await ClaimTimelineService.logEvent(
      legalProcess.debtClaimId,
      "NOTIFICATION_SENT",
      `Herinnering voor beoordeling van Inactief GOP verzonden (beoordeling ${reviewDate})`,
      { reviewDate: legalProcess.reviewDate },
    );

    reviewReminders++;
  }

  return {
    message: "GOP-termijnherinneringen verwerkt",
    prescriptionReminders,
    reviewReminders,
  };
}
