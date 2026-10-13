import { prisma } from "@/lib/prisma";
import { CollectionService } from "@/modules/collection/services/collection.service";
import { AgreementService } from "@/modules/agreement/services/agreement.service";
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
const DEFAULT_AGREEMENT_BREACH_FEE = 93.5;

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
    const currentStepId = currentStep?.id ?? null;

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
    const tenant = aop.debtClaim.tenant;

    // Check for active payment agreement
    const acceptedAgreementId = await AgreementService.getAcceptedId(debtClaimId);
    const hasActiveAgreement = !!acceptedAgreementId;

    if (hasActiveAgreement) {
      const paymentsOk = await AgreementService.hasPaymentsUpToDate(debtClaimId);
      if (paymentsOk) {
        // Ruta Inteligente CFSB (punto 5): existe un acuerdo de pago
        // ACCEPTED y el deudor está al día con las cuotas — el AOP no debe
        // seguir escalando pasos mientras el acuerdo se cumple. Antes este
        // chequeo solo eximía del recargo por no-respuesta pero igual
        // avanzaba el paso; ahora directamente no se toca el expediente en
        // esta corrida.
        continue;
      }
    }

    // A partir de acá solo quedan escrituras: multa (si corresponde),
    // cancelación del acuerdo incumplido (si corresponde) y avance de paso.
    // Van todas en una sola transacción para que no puedan quedar a medias
    // ni duplicarse si el job llegara a correr dos veces sobre el mismo
    // expediente en paralelo — el guard de abajo reconfirma que el paso
    // actual sigue IN_PROGRESS antes de tocar nada.
    await prisma.$transaction(
      async (tx) => {
        if (currentStepId) {
          const freshStep = await tx.administrativeCollectionStep.findUnique({
            where: { id: currentStepId },
            select: { status: true },
          });
          if (!freshStep || freshStep.status !== "IN_PROGRESS") {
            // Otra corrida ya completó este paso — no repetir la multa ni
            // el avance.
            return;
          }
        }

        if (hasActiveAgreement) {
          // Acuerdo incumplido durante aanmaning/sommatie: boete vaste van
          // USD 93,50 (Setting `agreement_breach_fee`), nooit samen con la
          // no-response-boete van 150/250 van hetzelfde evento — dezelfde
          // registratie als applyNoResponseFee (obligación DEBTOR -> CFSB),
          // zodat de deudor dit later aan CFSB moet betalen. Se asocia al
          // acuerdo exacto que se incumplió (relatedAgreementId) para
          // trazabilidad.
          if (currentStepType === "REMINDER" || currentStepType === "FINAL_NOTICE") {
            const breachFee = await SettingsService.resolveNumber(
              "agreement_breach_fee",
              { tenantId: tenant.id, jurisdictionId: tenant.jurisdictionId },
              DEFAULT_AGREEMENT_BREACH_FEE,
            );

            await CollectionService.applyAgreementBreachFee(
              debtClaimId,
              currentStepType,
              breachFee,
              acceptedAgreementId,
              tx,
            );
          }

          await AgreementService.cancelByClaim(debtClaimId, tx);
          // El acuerdo se acaba de cancelar por incumplimiento: cae al
          // avance normal de paso más abajo, igual que si nunca hubiera
          // existido un acuerdo.
        } else if (
          (currentStepType === "REMINDER" || currentStepType === "FINAL_NOTICE") &&
          !(await CollectionService.hasPrincipalPayment(debtClaimId))
        ) {
          // Sin acuerdo de pago vigente NI pago directo registrado
          // (transferencia verificada sin Agreement formal — antes solo se
          // chequeaba hasAgreement, así que un deudor que pagó directo sin
          // acuerdo igual recibía el recargo): el deudor no reaccionó dentro
          // del plazo de la aanmaning o la sommatie. CFSB cobra un recargo
          // administrativo fijo, configurable por isla/tenant — es una
          // obligación del deudor CON CFSB, separada de la comisión de
          // cobranza que ya paga el participante (punto 9 del análisis CFSB).
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

          await CollectionService.applyNoResponseFee(
            debtClaimId,
            currentStepType,
            noResponseFee,
            tx,
          );
        }

        const { nextStep } = await CollectionService.advanceAOPStep(debtClaimId, tx);
        return nextStep;
      },
      { timeout: 20000, maxWait: 10000 },
    ).then(async (nextStep) => {
      if (nextStep === undefined) return; // guard activado, no se avanzó nada

      await CollectionNotificationService.sendNotification(debtClaimId);
      sent++;

      if (nextStep === "BLK_NOTIFICATION") {
        try {
          const collectionId = await CollectiveCollectionService.tryAutoContinueFromAop(
            debtClaimId,
            tenant.id,
            tenant.jurisdictionId,
          );
          if (collectionId) copAutoContinued++;
        } catch (error) {
          console.error("Error auto-continuing COP from AOP:", error);
        }
      }
    });
  }

  return { message: "Notificaties succesvol verzonden", sent, copAutoContinued };
}
