import { CaseTransferService } from "@/modules/legal-process/services/case-transfer.service";

// Herinnering (elke ~30 dagen) aan de advocaat terwijl zijn CFSB-vergoeding
// (LawyerFeeInvoice) PENDING_PAYMENT blijft — naast de blokkade die al
// geldt zodra hij een nieuwe overdracht probeert te accepteren (ver
// CaseTransferService.acceptTransfer).
export async function checkLawyerFeePaymentReminders() {
  const result = await CaseTransferService.sendLawyerFeePaymentReminders();
  return { message: "CFSB-vergoeding herinneringen gecontroleerd", ...result };
}
