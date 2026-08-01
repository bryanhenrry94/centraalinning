import { prisma } from "@/lib/prisma";
import { processSubscriptionPayment } from "./subscription-processor";
import { processContractPayment } from "./contract-processor";
import { processFinancialReportPayment } from "./financial-report-processor";
import { PaymentType } from "./payment.validators";
import { processCollectionPayment } from "@/modules/collection/services/collection.service";
import { BlockadeService } from "@/modules/blockade/services/blockade.service";
import { LegalProcessService } from "@/modules/legal-process/services/legal-process.service";

export async function processSuccessfulPayment(paymentId: string) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
  });

  if (!payment) {
    throw new Error("Payment not found");
  }

  switch (payment.payment_type) {
    case PaymentType.SUBSCRIPTION:
      return processSubscriptionPayment(payment);

    case PaymentType.CONTRACT_ACTIVATION:
      return processContractPayment(payment);

    case PaymentType.FINANCIAL_REPORT:
      return processFinancialReportPayment(payment);

    case PaymentType.COLLECTION:
      return processCollectionPayment(payment.id);

    case PaymentType.BLOK_CHECK:
      return BlockadeService.processBlokCheckPayment(payment.id);

    case PaymentType.GOP:
      return LegalProcessService.processGopFeePaymentConfirmed(payment.id);

    case PaymentType.GOP_TRANSFER:
      return LegalProcessService.confirmTransferPayment(payment.id);

    default:
      console.warn(`No processor found for ${payment.payment_type}`);
  }
}
