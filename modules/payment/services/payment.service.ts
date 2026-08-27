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
        // Se guarda también acá (no solo como referencia externa en Sentoo)
        // porque hay código que necesita ubicar un Payment por su contexto
        // de negocio (p.ej. facturas GOP filtradas por debtClaimId) sin
        // depender de provider_payload.
        reference_number: payload.reference || null,
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

      await prisma.payment.update({
        where: { id: paymentRes.id },
        data: { status: "failed" },
      });

      const message =
        sentooRes.reason === "BANK_REJECTED"
          ? "De betaling werd geweigerd door de bank. Probeer het opnieuw of gebruik een andere betaalmethode."
          : "Het aanmaken van de betaling bij Sentoo is mislukt.";

      return {
        success: false,
        message,
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

    return paymentRes;
  };

  static getByIdForTenant = async (id: string, tenantId: string) => {
    return await prisma.payment.findUnique({
      where: { id, tenant_id: tenantId },
    });
  };

  // El pago vive bajo el tenant del debtClaim (acreedor), pero quien lo paga
  // y hace polling del status es a menudo el abogado/alguacil externo,
  // autenticado bajo su PROPIO tenant (bufete/despacho) — no el del
  // acreedor. Por eso el status endpoint no puede filtrar solo por
  // session.user.tenant_id: además del staff del tenant dueño del pago, se
  // permite al abogado/alguacil asignado al CaseTransfer/LegalProcess que
  // originó ese pago (GOP_LAWYER_FEE / GOP_BAILIFF_FEE / GOP_ACTIVATION —
  // esta última la paga el alguacil al registrar el primer vonnis, ver
  // LegalProcessService.registerFirstVerdict).
  static getByIdWithAssignedParty = async (id: string) => {
    return await prisma.payment.findUnique({
      where: { id },
      include: {
        lawyer_fee_invoice: { include: { caseTransfer: { include: { lawyer: true } } } },
        bailiff_fee_invoice: { include: { legalProcess: { include: { bailiff: true } } } },
        legal_process_activation: { include: { bailiff: true } },
      },
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
