"use server";
import { sentooRequest } from "@/lib/sentoo";
import { SentooService } from "@/services/providers/sentoo.service";

export async function createSentooPayment(input: {
  amount: number;
  description: string;
  reference: string;
}) {
  try {
    // Convierte dólares a centavos de forma segura
    console.log("before amountSentoo: ", input.amount);
    const amountSentoo = await toCents(input.amount);

    // Validación requerida por Sentoo
    if (amountSentoo < 100) {
      throw new Error("Sentoo amount must be at least 100 cents ($1.00)");
    }

    console.log("after amountSentoo: ", amountSentoo);

    const reference =
      input.reference && input.reference.trim() !== ""
        ? input.reference
        : `debt_${Date.now()}`;

    const body = new URLSearchParams({
      sentoo_merchant: process.env.SENTOO_MERCHANT!,
      sentoo_currency: "USD",
      sentoo_amount: amountSentoo.toString(),
      sentoo_description: input.description,
      sentoo_expires: "2026-12-31T23:59:59+00:00",
      sentoo_reference: reference,
      sentoo_return_url: `${process.env.APP_URL}/payment/return`,
      sentoo_callback_url: `${process.env.APP_URL}/api/sentoo/webhook`,
    });

    console.log("BODY STRING:", body.toString());
    console.log("BODY OBJECT:", Object.fromEntries(body.entries()));

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

    const sentooSuccess = result.status === 200 ? result.data?.success : null;

    console.log("Sentoo payment success data:", sentooSuccess);

    // 🛑 Respuesta inválida o inesperada
    if (!sentooSuccess || sentooSuccess.code !== 200) {
      return {
        success: false,
        reason: "SENTOO_ERROR",
        sentoo: result.data,
      };
    }

    // ✅ Datos reales del pago
    const payment = {
      id: sentooSuccess.message, // este es el transactionId que usaremos para verificar el pago
      url: sentooSuccess.data.url,
      qrCode: sentooSuccess.data.qr_code,
      payload: Object.fromEntries(body.entries()),
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

export const toCents = async (amount: string | number): Promise<number> => {
  const [whole, decimal = "00"] = amount.toString().split(".");

  const cents = decimal.padEnd(2, "0").slice(0, 2);

  return parseInt(whole, 10) * 100 + parseInt(cents, 10);
};

export async function verifySentooPayment(transactionId: string) {
  const res = await SentooService.verifySentooPayment(transactionId);
  if (!res.success) {
    throw new Error("Failed to verify Sentoo payment");
  }

  return {
    status: res.status,
  };
}
