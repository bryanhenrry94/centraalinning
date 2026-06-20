"use server";
import { prisma } from "@/lib/prisma";
import { Payment, PaymentCreate } from "@/lib/validations/payment";
import { Decimal } from "@prisma/client/runtime/library";

interface PaymentFilter {
  debt_id?: string;
}

export const getPayments = async (
  filter: PaymentFilter,
): Promise<{ success: boolean; error?: string; data?: Payment[] }> => {
  try {
    const payments = await prisma.payment.findMany({
      where: {
        debt_id: filter.debt_id,
      },
    });

    const formattedPayments: Payment[] = payments.map((payment: any) => ({
      ...payment,
      debt_id: payment.debt_id ?? "",
      total_amount:
        typeof payment.total_amount === "object" &&
        "toNumber" in payment.total_amount
          ? payment.total_amount.toNumber()
          : Number(payment.total_amount),
      method:
        payment.method === "CREDIT_CARD"
          ? "CREDIT_CARD"
          : (payment.method as "TRANSFER" | "CREDIT_CARD"),
      paid_at: payment.paid_at ? payment.paid_at.toISOString() : "",
      reference_number: payment.reference_number ?? undefined,
      status: payment.status as any,
      provider_payload: payment.provider_payload as any,
      created_at: payment.created_at,
      updated_at: payment.updated_at,
    }));

    return { success: true, data: formattedPayments };
  } catch (error) {
    console.error("Error fetching payments:", error);
    return { success: false, error: "Error fetching payments" };
  }
};

export const getPaymentsByInvoice = async (
  debt_id: string,
): Promise<Payment[]> => {
  const payments = await prisma.payment.findMany({
    where: { debt_id: debt_id },
  });

  return payments.map((payment: any) => ({
    ...payment,
    debt_id: payment.debt_id ?? "",
    total_amount:
      typeof payment.total_amount === "object" &&
      "toNumber" in payment.total_amount
        ? payment.total_amount.toNumber()
        : Number(payment.total_amount),
    method:
      payment.method === "CREDIT_CARD"
        ? "CREDIT_CARD"
        : (payment.method as "TRANSFER" | "CREDIT_CARD"),
    paid_at: payment.paid_at ? payment.paid_at.toISOString() : "",
    reference_number: payment.reference_number ?? undefined,
    status: payment.status as any,
    provider_payload: payment.provider_payload as any,
    created_at: payment.created_at,
    updated_at: payment.updated_at,
  }));
};

export const getPaymentsByDebtor = async (
  tenant_id: string,
  debtor_id: string,
) => {
  // const payments = await prisma.paymentDetail.findMany({
  //   where: {
  //     accountsReceivable: {
  //       debtor_id: debtor_id,
  //       tenant_id: tenant_id,
  //     },
  //   },
  //   include: {
  //     accountsReceivable: true,
  //   },
  // });
  // return payments;
};

export const getPaymentById = async (paymentId: string) => {
  // const payment = await prisma.paymentDetail.findUnique({
  //   where: { id: paymentId },
  //   include: {
  //     accountsReceivable: {
  //       include: {
  //         debtor: true,
  //       },
  //     },
  //   },
  // });
  // if (!payment) {
  //   throw new Error("Payment not found");
  // }
  // return payment;
};

export const updatePayment = async (
  tenant_id: string,
  paymentId: string,
  data: any,
) => {
  // const payment = await prisma.paymentDetail.findUnique({
  //   where: { id: paymentId, accountsReceivable: { tenant_id: tenant_id } },
  // });
  // if (!payment) {
  //   throw new Error("Payment not found");
  // }
  // const updatedPayment = await prisma.paymentDetail.update({
  //   where: { id: paymentId },
  //   data,
  // });
  // // Recalculate the invoice balance
  // await recalculateInvoiceBalance(tenant_id, payment.accountsReceivableId);
  // return updatedPayment;
};

export const deletePayment = async (tenant_id: string, paymentId: string) => {
  // const payment = await prisma.paymentDetail.findUnique({
  //   where: { id: paymentId, accountsReceivable: { tenant_id: tenant_id } },
  // });
  // if (!payment) {
  //   throw new Error("Payment not found");
  // }
  // const debt_id = payment.accountsReceivableId;
  // await prisma.paymentDetail.delete({
  //   where: { id: paymentId },
  // });
  // // Recalculate the invoice balance
  // await recalculateInvoiceBalance(tenant_id, debt_id);
};

// 9. Validar consistencia: Recalcular automáticamente el saldo pendiente de una factura
export const recalculateInvoiceBalance = async (
  tenant_id: string,
  debt_id: string,
) => {
  //
  // const payments = await prisma.paymentDetail.findMany({
  //   where: {
  //     accountsReceivableId: debt_id,
  //     accountsReceivable: { tenant_id: tenant_id },
  //   },
  // });
  // // Sumar todos los pagos realizados
  // const totalPaid = payments.reduce(
  //   (sum, payment) => sum + payment.paymentAmount,
  //   0
  // );
  // // Obtener la factura asociada
  // const invoice = await prisma.accountsReceivable.findUnique({
  //   where: { id: debt_id, tenant_id: tenant_id },
  // });
  // if (!invoice) {
  //   throw new Error("Invoice not found");
  // }
  // const remainingBalance = invoice.invoiceAmount - totalPaid;
  // await prisma.accountsReceivable.update({
  //   where: { id: debt_id },
  //   data: {
  //     remainingBalance: remainingBalance,
  //     // receivableStatus: remainingBalance <= 0 ? "paid" : "pending",
  //   },
  // });
  // // Recalcular el saldo pendiente del acuerdo de pago, si existe
  // if (invoice.paymentAgreementId) {
  //   recalculatePaymentAgreement(tenant_id, invoice.paymentAgreementId).catch(
  //     (error) => {
  //       console.error("Error recalculating payment agreement:", error);
  //     }
  //   );
  // }
  // // Si hay un acuerdo de pago, actualizar el saldo restante
  // await updateInvoiceStatusIfPaid(debt_id);
};

// Recalcular los valores de PaymentAgreement
export const recalculatePaymentAgreement = async (
  tenant_id: string,
  paymentAgreementId: string,
) => {
  // Obtener el acuerdo de pago
  // const collectionCaseAgreement = await prisma.collectionCaseAgreement.findUnique({
  //   where: { id: paymentAgreementId },
  //   include: {
  //     Installments: true,
  //     PaymentDetail: true,
  //   },
  // });
  // if (!collectionCaseAgreement) {
  //   throw new Error("Payment agreement not found");
  // }
  // // Obtener todos los pagos relacionados con el acuerdo de pago
  // const payments = await prisma.paymentDetail.findMany({
  //   where: {
  //     paymentAgreementId: paymentAgreementId,
  //     accountsReceivable: { tenant_id: tenant_id },
  //   },
  // });
  // // Calcular el total pagado
  // const totalPaid = payments.reduce(
  //   (sum, payment) => sum + payment.paymentAmount,
  //   0
  // );
  // // Calcular el saldo restante
  // const remainingBalance = collectionCaseAgreement.total_amount - totalPaid;
  // // Actualizar el acuerdo de pago
  // await prisma.collectionCaseAgreement.update({
  //   where: { id: paymentAgreementId },
  //   data: {
  //     totalPaid: parseFloat(totalPaid.toFixed(2)),
  //     remainingBalance: parseFloat(remainingBalance.toFixed(2)),
  //     paymentStatus: remainingBalance <= 0 ? "completed" : "active",
  //   },
  // });
  // return { success: true };
};

// 10. Validar consistencia: Actualizar estado de factura cuando ya se pagó completamente
export const updateInvoiceStatusIfPaid = async (debt_id: string) => {
  // const invoice = await prisma.accountsReceivable.findUnique({
  //   where: { id: debt_id },
  // });
  // if (!invoice) {
  //   throw new Error("Invoice not found");
  // }
  // // Sumamos todos los fees de cobranza y ABB
  // const totalFees = invoice.clientCollectionAmount + invoice.clientAbbAmount;
  // // + invoice.adminCollectionAmount
  // // + invoice.adminAbbAmount;
  // // Sumamos el monto de la factura con los fees
  // const totalWithFees = invoice.invoiceAmount + totalFees;
  // const payments = await prisma.paymentDetail.findMany({
  //   where: { accountsReceivableId: debt_id },
  // });
  // const totalPaid = payments.reduce(
  //   (sum, payment) => sum + payment.paymentAmount,
  //   0
  // );
  // console.log("Total Pagado:", totalPaid);
  // console.log("Total con Fees:", totalWithFees);
  // if (totalPaid >= totalWithFees) {
  //   await prisma.accountsReceivable.update({
  //     where: { id: debt_id },
  //     data: {
  //       receivableStatus: "paid",
  //       collectionStatus: "settled",
  //       remainingBalance: 0,
  //     },
  //   });
  //   // Si hay un acuerdo de pago, actualizar el estado
  //   if (invoice.hasPaymentAgreement && invoice.paymentAgreementId) {
  //     await prisma.collectionCaseAgreement.update({
  //       where: { id: invoice.paymentAgreementId },
  //       data: {
  //         paymentStatus: "completed",
  //         remainingBalance: 0,
  //       },
  //     });
  //   }
  // }
};

// 11. Distribuir pagos entre capital, interés, impuestos, cobranza, etc.
export const distributePayment = async (paymentDetailId: string) => {
  // // Fetch the payment detail and associated invoice
  // const paymentDetail = await prisma.paymentDetail.findUnique({
  //   where: { id: paymentDetailId },
  //   include: { accountsReceivable: true },
  // });
  // if (!paymentDetail) {
  //   throw new Error("Payment detail not found");
  // }
  // // Check if the payment detail is associated with an invoice
  // const invoice = paymentDetail.accountsReceivable;
  // if (!invoice) {
  //   throw new Error("Associated invoice not found");
  // }
  // let remainingAmount = paymentDetail.paymentAmount;
  // const paymentApplications: IPaymentApplication[] = [];
  // // Fetch existing payment applications for the invoice
  // const existingApplications = await prisma.paymentApplication.findMany({
  //   where: { accountsReceivableId: invoice.id },
  // });
  // const appliedAmounts = existingApplications.reduce((acc, app) => {
  //   acc[app.appliedTo] = (acc[app.appliedTo] || 0) + app.amountApplied;
  //   return acc;
  // }, {} as Record<string, number>);
  // // Apply to administrative fees (cobranza)
  // if (
  //   remainingAmount > 0 &&
  //   (appliedAmounts["ADMIN_COLLECTION_FEE"] || 0) <
  //     invoice.adminCollectionAmount
  // ) {
  //   const amountToApply = Math.min(
  //     invoice.adminCollectionAmount -
  //       (appliedAmounts["ADMIN_COLLECTION_FEE"] || 0),
  //     remainingAmount
  //   );
  //   paymentApplications.push({
  //     paymentDetailId,
  //     accountsReceivableId: invoice.id,
  //     amountApplied: amountToApply,
  //     appliedTo: "ADMIN_COLLECTION_FEE",
  //   });
  //   remainingAmount -= amountToApply;
  // }
  // // Apply to admin ABB fee (intereses de mora)
  // if (
  //   remainingAmount > 0 &&
  //   (appliedAmounts["ADMIN_ABB_FEE"] || 0) < invoice.adminAbbAmount
  // ) {
  //   const amountToApply = Math.min(
  //     invoice.adminAbbAmount - (appliedAmounts["ADMIN_ABB_FEE"] || 0),
  //     remainingAmount
  //   );
  //   paymentApplications.push({
  //     paymentDetailId,
  //     accountsReceivableId: invoice.id,
  //     amountApplied: amountToApply,
  //     appliedTo: "ADMIN_ABB_FEE",
  //   });
  //   remainingAmount -= amountToApply;
  // }
  // // Apply to client collection fee (cobranza)
  // if (
  //   remainingAmount > 0 &&
  //   (appliedAmounts["CLIENT_COLLECTION_FEE"] || 0) <
  //     invoice.clientCollectionAmount
  // ) {
  //   const amountToApply = Math.min(
  //     invoice.clientCollectionAmount -
  //       (appliedAmounts["CLIENT_COLLECTION_FEE"] || 0),
  //     remainingAmount
  //   );
  //   paymentApplications.push({
  //     paymentDetailId,
  //     accountsReceivableId: invoice.id,
  //     amountApplied: amountToApply,
  //     appliedTo: "CLIENT_COLLECTION_FEE",
  //   });
  //   remainingAmount -= amountToApply;
  // }
  // // Apply to client ABB fee (intereses de mora)
  // if (
  //   remainingAmount > 0 &&
  //   (appliedAmounts["CLIENT_ABB_FEE"] || 0) < invoice.clientAbbAmount
  // ) {
  //   const amountToApply = Math.min(
  //     invoice.clientAbbAmount - (appliedAmounts["CLIENT_ABB_FEE"] || 0),
  //     remainingAmount
  //   );
  //   paymentApplications.push({
  //     paymentDetailId,
  //     accountsReceivableId: invoice.id,
  //     amountApplied: amountToApply,
  //     appliedTo: "CLIENT_ABB_FEE",
  //   });
  //   remainingAmount -= amountToApply;
  // }
  // // Apply to interest (intereses de mora)
  // if (remainingAmount > 0) {
  //   if (
  //     invoice.interestFrozenAmount &&
  //     (appliedAmounts["INTEREST"] || 0) < invoice.interestFrozenAmount
  //   ) {
  //     const amountToApply = Math.min(
  //       invoice.interestFrozenAmount - (appliedAmounts["INTEREST"] || 0),
  //       remainingAmount
  //     );
  //     paymentApplications.push({
  //       paymentDetailId,
  //       accountsReceivableId: invoice.id,
  //       amountApplied: amountToApply,
  //       appliedTo: "INTEREST",
  //     });
  //     remainingAmount -= amountToApply;
  //   }
  // }
  // // Apply to capital (capital original)
  // if (remainingAmount > 0) {
  //   const amountToApply = Math.min(invoice.invoiceAmount, remainingAmount);
  //   paymentApplications.push({
  //     paymentDetailId,
  //     accountsReceivableId: invoice.id,
  //     amountApplied: amountToApply,
  //     appliedTo: "CAPITAL",
  //   });
  //   remainingAmount -= amountToApply;
  // }
  // // Save payment applications once all the amount is distributed
  // if (paymentApplications.length > 0) {
  //   for (const application of paymentApplications) {
  //     await prisma.paymentApplication.create({
  //       data: {
  //         paymentDetailId: application.paymentDetailId,
  //         accountsReceivableId: application.accountsReceivableId,
  //         amountApplied: application.amountApplied,
  //         appliedTo: application.appliedTo,
  //         created_at: new Date(),
  //         updated_at: new Date(),
  //       },
  //     });
  //   }
  // }
  // return { success: true, paymentApplications };
};

export const hasPendingPayments = async (debt_id: string): Promise<boolean> => {
  const pendingPayments = await prisma.payment.findMany({
    where: {
      debt_id: debt_id,
      status: "pending",
    },
  });

  return pendingPayments.length > 0;
};

export const getLinkToPayment = async (
  paymentId: string,
): Promise<string | null> => {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
  });

  if (!payment) {
    return null;
  }

  // Aquí asumimos que el payload tiene una URL, esto dependerá de cómo se guarde el payload
  const payload =
    typeof payment.provider_payload === "string"
      ? JSON.parse(payment.provider_payload)
      : (payment.provider_payload as any);

  return payload?.url || null;
};

export const getPaymentByDebtId = async (
  debt_id: string,
): Promise<Payment | null> => {
  const payment = await prisma.payment.findFirst({
    where: { debt_id: debt_id },
  });

  if (!payment) {
    return null;
  }

  const statusMap: {
    [key: string]: "pending" | "failed" | "cancelled" | "completed";
  } = {
    pending: "pending",
    failed: "failed",
    cancelled: "cancelled",
    completed: "completed",
    paid: "completed",
  };

  return {
    ...payment,
    debt_id: payment.debt_id ?? "",
    total_amount:
      typeof payment.total_amount === "object" &&
      "toNumber" in payment.total_amount
        ? payment.total_amount.toNumber()
        : Number(payment.total_amount),
    method:
      payment.method === "CREDIT_CARD"
        ? "CREDIT_CARD"
        : (payment.method as "TRANSFER" | "CREDIT_CARD"),
    status: statusMap[payment.status] || "pending",
    paid_at: payment.paid_at ? payment.paid_at.toISOString() : "",
    reference_number: payment.reference_number ?? undefined,
    created_at: payment.created_at,
    updated_at: payment.updated_at,
    provider: payment.provider as any,
    provider_payload: payment.provider_payload as any,
  };
};
