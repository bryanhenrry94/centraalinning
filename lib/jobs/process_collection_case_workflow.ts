import { prisma } from "@/lib/prisma";
import { updateCollectionStatusAndSendNotification } from "@/actions/collection-case";
import {
  cancelAgreementsByCollectionCase,
  hasAgreement,
  hasPaymentsUpToDate,
} from "@/actions/agreement";
import { applyFine } from "@/actions/debt-fine";
import { getLastNotificationDate } from "@/actions/notification";
import { CollectionCaseStatus } from "@/constants/collection-case-status";
import { PersonType } from "@/constants/person-type";
import { FineType } from "@/constants/fine-type";
import { ParameterService } from "@/services/parameter/parameter.service";

export async function processCollectionCaseWorkflow() {
  // Obtener todos los casos de cobranza en estados específicos sin notificación de bloqueo
  const collections = await prisma.collectionCase.findMany({
    where: {
      status: {
        in: [
          CollectionCaseStatus.AANMANING,
          CollectionCaseStatus.SOMMATIE,
          CollectionCaseStatus.INGEBREKESTELLING,
        ],
      },
      collectionCaseNotification: {
        none: {
          type: "BLOKKADE",
        },
      },
    },
    include: {
      debtor: {
        include: {
          person: true,
        },
      },
      collectionCaseNotification: true,
    },
  });

  // Obtener parámetros generales
  const parameter = await ParameterService.getParameter();

  let sent = 0;
  // Procesar cada caso de cobranza
  for (const c of collections) {
    // Comparar solo las fechas (sin horas)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    console.log(
      `Procesando caso de cobranza ID: ${c.id}, Estado: ${c.status}, Fecha de vencimiento: ${c.due_date.toISOString().split("T")[0]}, Hoy: ${today.toISOString().split("T")[0]}`,
    );

    // Calcular días entre notificaciones según el tipo de persona
    const days_between_aanmaning_sommatie =
      c.debtor.person?.person_type === PersonType.INDIVIDUAL
        ? Number(parameter?.consumer_aanmaning_term_days)
        : Number(parameter?.company_aanmaning_term_days);

    const days_between_sommatie_ingebrekestelling =
      c.debtor.person?.person_type === PersonType.INDIVIDUAL
        ? Number(parameter?.consumer_sommatie_term_days)
        : Number(parameter?.company_sommatie_term_days);

    const days_between_ingebrekestelling_blokkade =
      c.debtor.person?.person_type === PersonType.INDIVIDUAL
        ? Number(0)
        : Number(0);

    console.log(
      " Días entre ingebrekestelling y blokkade: ",
      days_between_ingebrekestelling_blokkade,
    );

    // Si la fecha de vencimiento es mayor o igual a hoy, no hacer nada
    if (c.due_date >= today) continue;

    // Obtener la fecha de la última notificación relevante
    const lastNotificationDate = await getLastNotificationDate(
      c.id,
      c.status as CollectionCaseStatus,
    );

    console.log("lastNotificationDate: ", lastNotificationDate);

    // Calcular la próxima fecha de notificación
    if (lastNotificationDate) {
      const nextNotificationDate = new Date(lastNotificationDate);

      if (c.status === CollectionCaseStatus.AANMANING) {
        nextNotificationDate.setDate(
          nextNotificationDate.getDate() + days_between_aanmaning_sommatie,
        );
      } else if (c.status === CollectionCaseStatus.SOMMATIE) {
        nextNotificationDate.setDate(
          nextNotificationDate.getDate() +
            days_between_sommatie_ingebrekestelling,
        );
      } else if (c.status === CollectionCaseStatus.INGEBREKESTELLING) {
        nextNotificationDate.setDate(
          nextNotificationDate.getDate() +
            days_between_ingebrekestelling_blokkade,
        );
      }

      // Comparar solo las fechas (sin horas)
      nextNotificationDate.setHours(0, 0, 0, 0);

      // Si la próxima fecha de notificación es mayor a hoy, no hacer nada
      if (nextNotificationDate > today) {
        console.log(
          `Próxima notificación para el caso de cobranza ID: ${c.id} es el ${nextNotificationDate.toISOString().split("T")[0]}`,
        );

        continue;
      }
    }

    console.log(
      `El caso de cobranza ID: ${c.id} es elegible para avanzar en el flujo.`,
    );

    // Verificar si tiene acuerdo de pago
    const has_payment_agreement = await hasAgreement(c.id);

    // Si tiene acuerdo de pago, verificar si los pagos están al día
    if (has_payment_agreement) {
      const has_payments_up_to_date = await hasPaymentsUpToDate(c.id);

      // Si no esta al dia registra multa, cancela el acuerdo de pago y avanza al siguiente estado
      if (!has_payments_up_to_date) {
        let penalty_amount = 0;

        if (c.status === CollectionCaseStatus.AANMANING) {
          penalty_amount =
            c.debtor.person?.person_type === PersonType.COMPANY
              ? Number(parameter?.company_aanmaning_penalty)
              : Number(parameter?.natural_aanmaning_penalty);
        }

        if (c.status === CollectionCaseStatus.SOMMATIE) {
          penalty_amount =
            c.debtor.person?.person_type === PersonType.COMPANY
              ? Number(parameter?.company_sommatie_penalty)
              : Number(parameter?.natural_sommatie_penalty);
        }

        if (penalty_amount > 0) {
          // Registrar multa
          if (c.debt_id) {
            await applyFine(
              c.debt_id,
              penalty_amount,
              `Multa por pago atrasado en estado ${c.status}`,
              FineType.PENALTY,
            );
          }
        }

        // Cancelar acuerdo de pago aceptados
        await cancelAgreementsByCollectionCase(c.id);
      }
    }

    if (c.status === CollectionCaseStatus.AANMANING) {
      await updateCollectionStatusAndSendNotification(
        c.id,
        CollectionCaseStatus.SOMMATIE,
      );
      sent++;
    }

    if (c.status === CollectionCaseStatus.SOMMATIE) {
      await updateCollectionStatusAndSendNotification(
        c.id,
        CollectionCaseStatus.INGEBREKESTELLING,
      );
      sent++;
    }

    if (c.status === CollectionCaseStatus.INGEBREKESTELLING) {
      await updateCollectionStatusAndSendNotification(
        c.id,
        CollectionCaseStatus.BLOKKADE,
      );
      sent++;
    }
  }

  return {
    message: "Notificaciones enviadas correctamente",
    sent,
  };
}
