import { sendFinancialReportMail } from "@/modules/payment/services/payment-mail.service";
import { prisma } from "@/lib/prisma";
import { Payment } from "@prisma/client";

export const processFinancialReportPayment = async (payment: Payment) => {
  console.log("Processing financial report payment:", payment.id);

  const financialReportRequest = await prisma.financialReportRequest.findFirst({
    where: {
      payment_id: payment.id,
    },
  });

  if (!financialReportRequest) {
    console.warn(`No financial report request found for payment ${payment.id}`);

    return;
  }

  // Evita reprocesar la misma solicitud
  if (financialReportRequest.payment_status === "paid") {
    console.log(
      `Financial report ${financialReportRequest.id} already processed`,
    );

    return;
  }

  await prisma.financialReportRequest.update({
    where: {
      id: financialReportRequest.id,
    },
    data: {
      payment_status: "paid",
    },
  });

  try {
    await sendFinancialReportMail(financialReportRequest.id);

    console.log(
      `✅ Financial report email sent for request ${financialReportRequest.id}`,
    );
  } catch (error) {
    console.error(
      `Failed sending financial report email for request ${financialReportRequest.id}`,
      error,
    );

    // Opcional:
    // Aquí podrías registrar el error en una tabla de jobs
    // para reintentar posteriormente.
  }
};
