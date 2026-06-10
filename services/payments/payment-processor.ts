import { prisma } from "@/lib/prisma";
import { processSubscriptionPayment } from "./subscription-processor";
import { processContractPayment } from "./contract-processor";
import { processBlokCheckPayment } from "./blokcheck-processor";
import { processFinancialReportPayment } from "./financial-report-processor";

export async function processSuccessfulPayment(paymentId: string) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
  });

  if (!payment) {
    throw new Error("Payment not found");
  }

  switch (payment.payment_type) {
    case "SUBSCRIPTION":
      return processSubscriptionPayment(payment);

    case "CONTRACT_ACTIVATION":
      return processContractPayment(payment);

    case "BLOK_CHECK":
      return processBlokCheckPayment(payment);

    case "FINANCIAL_REPORT":
      return processFinancialReportPayment(payment);

    default:
      console.warn(`No processor found for ${payment.payment_type}`);
  }
}
