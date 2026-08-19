import { prisma } from "@/lib/prisma";
import {
  advanceAOPStep,
  applyAopNoResponseFee,
  getDebtClaimsAction,
  hasPrincipalPayment,
} from "@/modules/collection/actions/debt-claim.actions";
import { applyCharge, countChargesForClaim } from "@/modules/collection/actions/debt-fine.actions";
import { hasAgreement, hasPaymentsUpToDate, cancelAgreementsByCliam } from "@/modules/agreement/actions/agreement.actions";
import { CollectionNotificationService } from "@/modules/collection/services/collection-notification.service";
import { PersonType } from "@/shared/constants/person-type";
import { ParameterService } from "@/modules/settings/services/parameter/parameter.service";
import { SettingsService } from "@/modules/settings/services/settings/settings.service";
import { CollectiveCollectionService } from "@/modules/collective-follow-up/services/collective-collection.service";

type AOPStep = "REMINDER" | "FINAL_NOTICE" | "DEFAULT_NOTICE" | "BLK_NOTIFICATION";

// Valores por defecto — el Superadministrador configura el recargo real por
// isla/tenant editando los Settings aanmaning_no_response_fee /
// sommatie_no_response_fee (punto 9 del análisis CFSB), sin tocar código.
const DEFAULT_AANMANING_NO_RESPONSE_FEE = 150;
const DEFAULT_SOMMATIE_NO_RESPONSE_FEE = 250;

const STEP_SEQUENCE: AOPStep[] = [
  "REMINDER",
  "FINAL_NOTICE",
  "DEFAULT_NOTICE",
  "BLK_NOTIFICATION",
];

export async function processAopWorkflow() {
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
          tenant: true,
        },
      },
    },
  });

  // Cache por tenant: dentro de una misma corrida del job suele haber varios
  // AOP del mismo tenant, y cada uno resuelve la jerarquía
  // Setting(tenant) -> Setting(isla) -> Jurisdiction -> Parameter global.
  const parameterCache = new Map<
    string,
    Awaited<ReturnType<typeof ParameterService.getParameterForTenant>>
  >();

  const getParameterForTenantCached = async (tenantId: string) => {
    if (!parameterCache.has(tenantId)) {
      parameterCache.set(
        tenantId,
        await ParameterService.getParameterForTenant(tenantId),
      );
    }
    return parameterCache.get(tenantId)!;
  };

  let sent = 0;
  let copAutoContinued = 0;

  for (const aop of activeCollections) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Plazos/multas por tenant (isla), no el Parameter global — así los
    // cambios que el Superadministrador hace en Settings por isla sí
    // afectan al AOP en curso.
    const parameter = await getParameterForTenantCached(aop.debtClaim.tenant.id);

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
    } else if (
      (currentStepType === "REMINDER" || currentStepType === "FINAL_NOTICE") &&
      !(await hasPrincipalPayment(debtClaimId))
    ) {
      // Sin acuerdo de pago vigente NI pago directo registrado (transferencia
      // verificada sin Agreement formal — antes solo se chequeaba
      // hasAgreement, así que un deudor que pagó directo sin acuerdo igual
      // recibía el recargo): el deudor no reaccionó dentro del plazo de la
      // aanmaning o la sommatie. CFSB cobra un recargo administrativo fijo,
      // configurable por isla/tenant — es una obligación del deudor CON
      // CFSB, separada de la comisión de cobranza que ya paga el
      // participante (punto 9 del análisis CFSB).
      const tenant = aop.debtClaim.tenant;
      const feeKey =
        currentStepType === "REMINDER"
          ? "aanmaning_no_response_fee"
          : "sommatie_no_response_fee";
      const defaultFee =
        currentStepType === "REMINDER"
          ? DEFAULT_AANMANING_NO_RESPONSE_FEE
          : DEFAULT_SOMMATIE_NO_RESPONSE_FEE;

      const noResponseFee = await SettingsService.resolveNumber(
        feeKey,
        { tenantId: tenant.id, jurisdictionId: tenant.jurisdictionId },
        defaultFee,
      );

      await applyAopNoResponseFee(debtClaimId, currentStepType, noResponseFee);
    }

    const { nextStep } = await advanceAOPStep(debtClaimId);
    await CollectionNotificationService.sendNotification(debtClaimId);
    sent++;

    if (nextStep === "BLK_NOTIFICATION") {
      try {
        const collectionId = await CollectiveCollectionService.tryAutoContinueFromAop(
          debtClaimId,
          aop.debtClaim.tenant.id,
          aop.debtClaim.tenant.jurisdictionId,
        );
        if (collectionId) copAutoContinued++;
      } catch (error) {
        console.error("Error auto-continuing COP from AOP:", error);
      }
    }
  }

  return { message: "Notificaties succesvol verzonden", sent, copAutoContinued };
}
