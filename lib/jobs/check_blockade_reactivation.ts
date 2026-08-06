import { BlockadeService } from "@/modules/blockade/services/blockade.service";
import {
  getPaymentAgreements,
  hasPaymentsUpToDate,
  cancelAgreementsByCliam,
} from "@/modules/agreement/actions/agreement.actions";
import { AgreementStatus } from "@/modules/agreement/constants/agreement-status";
import { NotificationService } from "@/modules/notification/services/notification.service";
import { NotificationType } from "@/modules/notification/constants/notification-type";
import { prisma } from "@/lib/prisma";

// El job principal de AOP (process_aop_workflow.ts) excluye los
// dossiers que ya llegaron a BLK_NOTIFICATION, así que nunca vuelve a
// revisarlos. Un bloqueo SUSPENDED por un acuerdo aceptado necesita este
// chequeo aparte para detectar incumplimientos y reactivar el bloqueo.
export async function checkBlockadeReactivation() {
  const suspended = await BlockadeService.getSuspended();
  let reactivated = 0;

  for (const blockade of suspended) {
    const agreements = await getPaymentAgreements({
      tenant_id: blockade.tenantId,
      debtor_id: blockade.debtorId,
      status: AgreementStatus.ACCEPTED,
    });
    const agreement = agreements[0];
    if (!agreement) continue;

    const paymentsOk = await hasPaymentsUpToDate(agreement.debtClaim_id);
    if (paymentsOk) continue;

    await cancelAgreementsByCliam(agreement.debtClaim_id);
    await BlockadeService.reactivate(blockade.id);
    reactivated++;

    try {
      const debtor = await prisma.debtor.findUnique({ where: { id: blockade.debtorId } });
      if (debtor?.user_id) {
        await NotificationService.create({
          tenant_id: blockade.tenantId,
          user_id: debtor.user_id,
          type: NotificationType.BLOCKADE_REACTIVATED,
          title: "Economische blokkade opnieuw geactiveerd",
          message:
            "Uw betalingsregeling is geannuleerd wegens gemiste termijnen. Uw economische blokkade is daarom opnieuw geactiveerd.",
          link: "/agreements",
          entity_type: "Agreement",
          entity_id: agreement.id,
        });
      }
    } catch (error) {
      console.error("Error notifying debtor of blockade reactivation:", error);
    }
  }

  return { message: "Blokkade-reactivering verwerkt", reactivated };
}
