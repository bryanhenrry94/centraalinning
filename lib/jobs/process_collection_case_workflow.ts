import { prisma } from "@/lib/prisma";
import { advanceAOPStep, getDebtClaimsAction } from "@/modules/collection/actions/collection-case.actions";
import { applyCharge, countChargesForClaim } from "@/modules/collection/actions/debt-fine.actions";
import { hasAgreement, hasPaymentsUpToDate, cancelAgreementsByCliam } from "@/modules/agreement/actions/agreement.actions";
import { CollectionNotificationService } from "@/modules/collection/services/collection-notification.service";
import { PersonType } from "@/shared/constants/person-type";
import { ParameterService } from "@/modules/settings/services/parameter/parameter.service";

type AOPStep = "REMINDER" | "FINAL_NOTICE" | "DEFAULT_NOTICE" | "BLK_NOTIFICATION";

const STEP_SEQUENCE: AOPStep[] = [
  "REMINDER",
  "FINAL_NOTICE",
  "DEFAULT_NOTICE",
  "BLK_NOTIFICATION",
];

export async function processCollectionCaseWorkflow() {
  const activeCollections = await prisma.administrativeCollection.findMany({
    where: {
      status: "ACTIVE",
      steps: {
        none: { step: "BLK_NOTIFICATION" },
      },
    },
    include: {
      steps: { orderBy: { id: "desc" } },
      debtClaim: {
        include: {
          debtor: { include: { person: true } },
        },
      },
    },
  });

  const parameter = await ParameterService.getParameter();
  let sent = 0;

  for (const aop of activeCollections) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const currentStep = aop.steps[0] as (typeof aop.steps)[0] | undefined;
    const currentStepType = (currentStep?.step ?? null) as AOPStep | null;

    const personType =
      (aop.debtClaim.debtor.person?.person_type as PersonType) ||
      PersonType.INDIVIDUAL;

    const daysMap: Record<AOPStep, number> = {
      REMINDER:
        personType === PersonType.INDIVIDUAL
          ? Number(parameter?.consumer_aanmaning_term_days ?? 0)
          : Number(parameter?.company_aanmaning_term_days ?? 0),
      FINAL_NOTICE:
        personType === PersonType.INDIVIDUAL
          ? Number(parameter?.consumer_sommatie_term_days ?? 0)
          : Number(parameter?.company_sommatie_term_days ?? 0),
      DEFAULT_NOTICE: 0,
      BLK_NOTIFICATION: 0,
    };

    if (currentStepType) {
      const lastSentAt = currentStep?.sentAt;
      if (!lastSentAt) continue;

      const nextNotificationDate = new Date(lastSentAt);
      nextNotificationDate.setDate(
        nextNotificationDate.getDate() + (daysMap[currentStepType] ?? 0),
      );
      nextNotificationDate.setHours(0, 0, 0, 0);

      if (nextNotificationDate > today) continue;
    }

    const debtClaimId = aop.debtClaim.id;

    // Check for active payment agreement
    const hasActiveAgreement = await hasAgreement(debtClaimId);
    if (hasActiveAgreement) {
      const paymentsOk = await hasPaymentsUpToDate(debtClaimId);
      if (!paymentsOk) {
        const penaltyMap: Record<string, number> = {
          REMINDER:
            personType === PersonType.COMPANY
              ? Number(parameter?.company_aanmaning_penalty ?? 0)
              : Number(parameter?.natural_aanmaning_penalty ?? 0),
          FINAL_NOTICE:
            personType === PersonType.COMPANY
              ? Number(parameter?.company_sommatie_penalty ?? 0)
              : Number(parameter?.natural_sommatie_penalty ?? 0),
        };

        const penaltyAmount = currentStepType
          ? (penaltyMap[currentStepType] ?? 0)
          : 0;

        if (penaltyAmount > 0) {
          await applyCharge(
            debtClaimId,
            penaltyAmount,
            `Boete voor achterstallige betaling in stap ${currentStepType}`,
            "AOP",
          );
        }

        await cancelAgreementsByCliam(debtClaimId);
      }
    }

    await advanceAOPStep(debtClaimId);
    await CollectionNotificationService.sendNotification(debtClaimId);
    sent++;
  }

  return { message: "Notificaties succesvol verzonden", sent };
}
