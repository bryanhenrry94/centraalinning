import { SentooPaymentCreate, SentooPaymentResult } from "./sentoo.types";

export class SentooService {
  static createTransaction = async (
    payload: SentooPaymentCreate,
  ): Promise<SentooPaymentResult> => {
    try {
      // Convierte dólares a centavos de forma segura
      const amountSentoo = await this.toCents(payload.amount);

      // Validación requerida por Sentoo
      if (amountSentoo < 100) {
        throw new Error("Sentoo amount must be at least 100 cents ($1.00)");
      }

      // Genera referencia única si no se proporciona
      const reference =
        payload.reference && payload.reference.trim() !== ""
          ? payload.reference
          : `debt_${Date.now()}`;

      const today = new Date();

      // expira en 24 horas
      const expires = new Date(
        today.getTime() + 24 * 60 * 60 * 1000,
      ).toISOString();

      const body = new URLSearchParams({
        sentoo_merchant: process.env.SENTOO_MERCHANT!,
        sentoo_currency: "USD",
        sentoo_amount: amountSentoo.toString(),
        sentoo_description: payload.description,
        sentoo_expires: expires,
        sentoo_reference: reference,
        sentoo_return_url: payload.urlReturn,
        sentoo_callback_url: `${process.env.APP_URL}/api/sentoo/webhook`,
      });

      console.log("Sending request to Sentoo with body:", body.toString());

      const url = `${process.env.SENTOO_API}/v1/payment/new`;

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "X-SENTOO-SECRET": process.env.SENTOO_SECRET!,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
        cache: "no-store",
      });

      const data = await res.json();

      console.log("sentoo response: ", data);

      // ❌ Errores técnicos reales
      if (!res.ok && res.status !== 402) {
        console.error("Sentoo technical error:", data);
        return {
          success: false,
          reason: "SENTOO_ERROR",
          raw: data, // respuesta original de Sentoo para trazabilidad
        };
      }

      // ⚠️ Pago rechazado por banco
      if (res.status === 402) {
        return {
          success: false,
          reason: "BANK_REJECTED",
          raw: data, // raw response
        };
      }

      const sentooSuccess = res.status === 200 ? data?.success : null;

      console.log("Sentoo payment success data:", data);

      // 🛑 Respuesta inválida o inesperada
      if (!sentooSuccess || sentooSuccess.code !== 200) {
        return {
          success: false,
          reason: "SENTOO_ERROR",
          raw: data,
        };
      }

      // ✅ Datos reales del pago
      const payment = {
        id: sentooSuccess.message, // este es el paymentId
        url: sentooSuccess.data.url,
        qrCode: sentooSuccess.data.qr_code,
        payload: Object.fromEntries(body.entries()),
      };

      return {
        success: true,
        payment,
        raw: data, // opcional: guarda respuesta original por trazabilidad
      };
    } catch (error) {
      console.error("Error en createSentooPayment:", error);
      return {
        success: false,
        reason: "INTERNAL_ERROR",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  };

  static verifySentooPayment = async (
    transactionId: string,
  ): Promise<{ success: boolean; status?: string; message?: string }> => {
    const endpoint = `/v1/payment/status/${process.env.SENTOO_MERCHANT!}/${transactionId}`;

    const res = await fetch(`${process.env.SENTOO_API}${endpoint}`, {
      method: "GET",
      headers: {
        "X-SENTOO-SECRET": process.env.SENTOO_SECRET!,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      cache: "no-store",
    });

    const data = await res.json();

    // ❌ Errores técnicos reales
    if (!res.ok && res.status !== 402) {
      console.error("Sentoo technical error:", data);
      return {
        success: false,
        message: data?.error?.message || "Sentoo request failed",
      };
    }

    if (!res.ok) {
      return {
        success: false,
        message: data?.error?.message || "Failed to verify Sentoo payment",
      };
    }

    // status puede ser "paid", "pending", "rejected", etc. según la respuesta de Sentoo
    const sentooStatus = data?.success?.message;

    return {
      success: true,
      status: sentooStatus,
    };
  };

  private static toCents = async (amount: string | number): Promise<number> => {
    const [whole, decimal = "00"] = amount.toString().split(".");

    const cents = decimal.padEnd(2, "0").slice(0, 2);

    return parseInt(whole, 10) * 100 + parseInt(cents, 10);
  };
}
