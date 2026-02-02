"use server";
import prisma from "@/lib/prisma";
import { getPaymentStatus, sentooRequest } from "@/lib/sentoo";
import { Prisma } from "@/prisma/generated/prisma";

export async function createSentooPayment(input: {
  amount: number;
  description: string;
  reference: string;
}) {
  try {
    const body = new URLSearchParams({
      sentoo_merchant: process.env.SENTOO_MERCHANT!,
      sentoo_currency: "USD",
      sentoo_amount: input.amount.toString(),
      sentoo_description: input.description,
      sentoo_expires: "2026-12-31T23:59:59+00:00",
      sentoo_return_url: `${process.env.APP_URL}/payment/return?status=`,
    });

    const providerPayload = Object.fromEntries(body.entries());

    const result = await sentooRequest("/v1/payment/new", body);

    console.log(
      "Sentoo payment creation result:",
      JSON.stringify(result, null, 2),
    );

    // ⚠️ Pago rechazado por banco
    if (result.status === 402) {
      return {
        success: false,
        reason: "BANK_REJECTED",
        sentoo: result.data, // raw response
      };
    }

    const sentooSuccess = result.data?.success;

    // 🛑 Respuesta inválida o inesperada
    if (!sentooSuccess || sentooSuccess.code !== 200) {
      return {
        success: false,
        reason: "SENTOO_ERROR",
        sentoo: result.data,
      };
    }

    await prisma.payment.create({
      data: {
        method: "TRANSFER",
        provider: "sentoo",
        provider_ref: sentooSuccess.message,
        provider_status: "pending",
        total_amount: new Prisma.Decimal(input.amount),
        status: "pending",
        provider_payload: providerPayload,
        paid_at: null,
      },
    });

    // ✅ Datos reales del pago
    const payment = {
      id: sentooSuccess.message, // este es el paymentId
      url: sentooSuccess.data.url,
      qrCode: sentooSuccess.data.qr_code,
    };

    return {
      success: true,
      payment,
      raw: result.data, // opcional: guarda respuesta original por trazabilidad
    };
  } catch (error) {
    console.error("Error en createSentooPayment:", error);
    return {
      success: false,
      reason: "INTERNAL_ERROR",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function verifySentooPayment(transactionId: string) {
  const url = `/v1/payment/status/${process.env.SENTOO_MERCHANT!}/${transactionId}`;

  const res = await getPaymentStatus(url);
  if (!res.ok) {
    throw new Error("Failed to verify Sentoo payment");
  }

  console.log("Sentoo payment status data:", JSON.stringify(res.data, null, 2));
  const sentooStatus = res.data.success.message;

  // Sincronizar con DB
  await prisma.payment.update({
    where: { provider_ref: transactionId },
    data: { provider_status: sentooStatus },
  });

  return {
    status: sentooStatus,
  };
}
