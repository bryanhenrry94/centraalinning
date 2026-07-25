import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { SentooService } from "@/infrastructure/sentoo/sentoo.service";
import {
  Payment,
  PaymentCreate,
  PaymentType,
} from "@/modules/payment/services/payment.validators";
import { PaymentStatus } from "@/modules/payment/types/PaymentStatus";
import { protocol } from "@/lib/config";

export interface PaymentResult {
  success: boolean;
  message: string;
  data?: {
    paymentId: string;
    paymentUrl: string;
  };
}

export interface PaymentPayload {
  id: string;
  url: string;
  qrCode: string;
  payload: Record<string, any>;
}

export class PaymentService {
  static create = async (
    tenant_id: string,
    payload: {
      amount: number;
      currency: string;
      description: string;
      reference?: string;
      payment_type?: string;
      obligationId?: string | null;
      contractId?: string | null;
    },
  ): Promise<PaymentResult> => {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenant_id },
    });

    if (!tenant) {
      return {
        success: false,
        message: "Tenant not found",
      };
    }

    // Create payment
    const paymentRes = await prisma.payment.create({
      data: {
        tenant_id: tenant_id,
        total_amount: new Prisma.Decimal(payload.amount),
        status: "pending",
        payment_type:
          (payload.payment_type as PaymentType) || PaymentType.OTHER,
        method: "TRANSFER",
        obligation_id: payload.obligationId || null,
        contract_id: payload.contractId || null,
      },
    });

    // Crear transacción en Sentoo
    const sentooRes = await SentooService.createTransaction({
      amount: payload.amount,
      currency: payload.currency || "USD",
      description: payload.description,
      reference: payload.reference || `payment_${paymentRes.id}`,
    });

    if (!sentooRes.success) {
      console.error("Error creating Sentoo payment:", sentooRes.raw);
      return {
        success: false,
        message: "Failed to create payment with Sentoo",
      };
    }

    const paymentUrl = sentooRes.payment?.url || "";

    // Actualizar el pago con la información de Sentoo
    await prisma.payment.update({
      where: { id: paymentRes.id },
      data: {
        provider: "sentoo",
        provider_ref: sentooRes.payment?.id || "",
        provider_payload: JSON.stringify(sentooRes.payment?.payload || {}),
        payment_url: paymentUrl,
      },
    });

    return {
      success: true,
      message: "Payment created successfully",
      data: {
        paymentId: paymentRes.id,
        paymentUrl: paymentUrl,
      },
    };
  };

  static registerPayment = async (
    tenant_id: string,
    payload: PaymentCreate,
  ) => {
    // Create payment
    const paymentRes = await prisma.payment.create({
      data: {
        tenant_id: tenant_id,
        method: payload.method || "TRANSFER",
        provider: payload.provider || "manual",
        provider_ref: payload.provider_ref || "",
        total_amount: new Prisma.Decimal(payload.total_amount),
        status: (payload.status as any) || "pending",
        contract_id: payload.contract_id || null,
        provider_payload: payload.provider_payload || "",
        payment_url: payload.payment_url || null,
        paid_at: null,
        payment_type: payload.payment_type || "OTHER",
      },
    });

    // // Check if the accounts receivable exists
    // const accountsReceivable = await prisma.accountsReceivable.findUnique({
    //   where: { id: payload.debt_id, tenant_id: tenant_id },
    //   include: { debtor: true },
    // });

    // if (!accountsReceivable) {
    //   throw new Error("Accounts receivable not found");
    // }
    // // Verificar si hay un acuerdo de pago asociado
    // const collectionCaseAgreement = await prisma.collectionCaseAgreement.findFirst({
    //   where: {
    //     accountsReceivableId: payload.debt_id,
    //     accountsReceivable: {
    //       tenant_id: tenant_id,
    //     },
    //   },
    // });

    // let remainingAmount = payload.paymentAmount;

    // if (collectionCaseAgreement) {
    //   // Si vienen cuotas específicas en el payload
    //   if (payload.installmentIds && payload.installmentIds.length > 0) {
    //     for (const installmentId of payload.installmentIds) {
    //       if (remainingAmount <= 0) break;

    //       const installment = await prisma.installment.findUnique({
    //         where: { id: installmentId },
    //       });

    //       if (
    //         !installment ||
    //         installment.paymentAgreementId !== collectionCaseAgreement.id
    //       ) {
    //         throw new Error(`Invalid installment ID: ${installmentId}`);
    //       }

    //       const amountToPay = Math.min(
    //         installment.remainingAmount,
    //         remainingAmount
    //       );

    //       // Actualizar el estado de la cuota
    //       const newRemainingAmount = installment.remainingAmount - amountToPay;
    //       const newAmountPaid = installment.amountPaid + amountToPay;
    //       const newStatus =
    //         newRemainingAmount === 0
    //           ? "paid"
    //           : newAmountPaid > 0
    //           ? "partially_paid"
    //           : "pending";

    //       await prisma.installment.update({
    //         where: { id: installment.id },
    //         data: {
    //           amountPaid: newAmountPaid,
    //           remainingAmount: newRemainingAmount,
    //           paid: newRemainingAmount === 0,
    //           paidAt: newRemainingAmount === 0 ? new Date() : null,
    //           status: newStatus,
    //         },
    //       });

    //       // Crear el detalle del pago especificando información de la cuota
    //       const payment = await prisma.paymentDetail.create({
    //         data: {
    //           accountsReceivableId: payload.debt_id,
    //           paymentAgreementId: collectionCaseAgreement.id,
    //           paymentAmount: amountToPay,
    //           paymentMethod: payload.paymentMethod,
    //           reference_number: payload.reference_number,
    //           notes: `Installment ${installment.installmentNumber}: ${payload.notes}`,
    //           created_at: new Date(),
    //           payment_date: new Date(),
    //         },
    //       });

    //       remainingAmount -= amountToPay;

    //       // Distribuir el pago entre capital, interés, impuestos, cobranza, etc.
    //       await distributePayment(payment.id);
    //     }
    //   }

    //   if (payload.initialPaymentStatus === "pending") {
    //     const amountToApply = payload.initialPayment || 0;

    //     if (amountToApply > 0) {
    //       // Crear el detalle del pago especificando información de la cuota
    //       await prisma.paymentDetail.create({
    //         data: {
    //           accountsReceivableId: payload.debt_id,
    //           paymentAgreementId: collectionCaseAgreement.id,
    //           paymentAmount: amountToApply,
    //           paymentMethod: payload.paymentMethod,
    //           reference_number: payload.reference_number,
    //           notes: `Initial Payment: ${payload.notes}`,
    //           created_at: new Date(),
    //           payment_date: new Date(),
    //         },
    //       });
    //     }

    //     // SI SE CREO EL PAGO SE ACTUALIZA EL ACUERDO DE PAGO
    //     await prisma.collectionCaseAgreement.update({
    //       where: { id: collectionCaseAgreement.id },
    //       data: {
    //         initialPaymentStatus:
    //           amountToApply === collectionCaseAgreement.initialPayment
    //             ? "completed"
    //             : "pending",
    //       },
    //     });
    //   }

    //   // Enviar el monto restante para recalcular el saldo pendiente, incluso si es cero
    //   await recalculateInvoiceBalance(tenant_id, payload.debt_id);
    // } else {
    //   // Si no hay acuerdo de pago, registrar el pago directamente
    //   const payment = await prisma.paymentDetail.create({
    //     data: {
    //       accountsReceivableId: payload.debt_id,
    //       paymentAmount: payload.paymentAmount,
    //       paymentMethod: payload.paymentMethod,
    //       reference_number: payload.reference_number,
    //       notes: payload.notes,
    //       created_at: new Date(),
    //       payment_date: new Date(),
    //     },
    //   });

    //   // Recalcular el saldo pendiente de la factura
    //   await recalculateInvoiceBalance(tenant_id, payload.debt_id);

    //   // Distribuir el pago entre capital, interés, impuestos, cobranza, etc.
    //   await distributePayment(payment.id);
    // }

    // await sendBetalingsbewijs(
    //   accountsReceivable.debtor?.fullname || "",
    //   payload.paymentMethod,
    //   payload.paymentAmount,
    //   payload.reference_number,
    //   accountsReceivable.debtor?.email || "",
    //   accountsReceivable.invoice_number
    // ).catch((error) => {
    //   console.error("Error sending Betalingsbewijs:", error);
    // });

    return paymentRes;
  };

  static getByIdForTenant = async (id: string, tenantId: string) => {
    return await prisma.payment.findUnique({
      where: { id, tenant_id: tenantId },
    });
  };

  static updateStatus = async (id: string, status: PaymentStatus) => {
    return await prisma.payment.update({
      where: { id },
      data: { status },
    });
  };

  private static mapPayment(payment: any): Payment {
    const statusMap: Record<
      string,
      "pending" | "failed" | "cancelled" | "completed"
    > = {
      pending: "pending",
      failed: "failed",
      cancelled: "cancelled",
      completed: "completed",
      paid: "completed",
    };

    return {
      ...payment,
      total_amount:
        typeof payment.total_amount === "object" &&
        "toNumber" in payment.total_amount
          ? payment.total_amount.toNumber()
          : Number(payment.total_amount),
      method: payment.method as "TRANSFER" | "CREDIT_CARD",
      paid_at: payment.paid_at ? payment.paid_at.toISOString() : "",
      reference_number: payment.reference_number ?? undefined,
      status: statusMap[payment.status] ?? "pending",
      provider_payload: payment.provider_payload as any,
      provider: payment.provider as any,
      created_at: payment.created_at,
      updated_at: payment.updated_at,
    };
  }

  static getByFilter = async (filter: {
    debtClaim_id?: string;
  }): Promise<{ success: boolean; error?: string; data?: Payment[] }> => {
    try {
      const payments = await prisma.payment.findMany();
      return { success: true, data: payments.map(this.mapPayment) };
    } catch {
      return { success: false, error: "Error fetching payments" };
    }
  };

  static getAllByDebtClaim = async (
    debtClaim_id: string,
  ): Promise<Payment[]> => {
    const payments = await prisma.payment.findMany({
      where: { obligation: { debtClaimId: debtClaim_id } },
      orderBy: { created_at: "desc" },
    });
    return payments.map(this.mapPayment);
  };

  static getByDebtorId = async (debtor_id: string): Promise<Payment[]> => {
    const payments = await prisma.payment.findMany({
      where: { obligation: { debtClaim: { debtorId: debtor_id } } },
      orderBy: { created_at: "desc" },
    });
    return payments.map(this.mapPayment);
  };

  static hasPending = async (debtClaim_id: string): Promise<boolean> => {
    const count = await prisma.payment.count();
    return count > 0;
  };

  static getLinkToPayment = async (
    paymentId: string,
  ): Promise<string | null> => {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
    });
    if (!payment) return null;
    const payload =
      typeof payment.provider_payload === "string"
        ? JSON.parse(payment.provider_payload)
        : (payment.provider_payload as any);
    return payload?.url || null;
  };

  static getFirstByDebtClaimId = async (
    debtClaim_id: string,
  ): Promise<Payment | null> => {
    const payment = await prisma.payment.findFirst();
    if (!payment) return null;
    return this.mapPayment(payment);
  };
}
