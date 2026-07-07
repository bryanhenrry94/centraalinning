import { SentooService } from "@/infrastructure/sentoo/sentoo.service";
import { prisma } from "@/lib/prisma";
import { processSuccessfulPayment } from "@/modules/payment/services/payment-processor";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();

    const transactionId = form.get("transaction_id")?.toString();

    console.log("📩 Sentoo webhook received:", {
      transactionId,
      raw: Object.fromEntries(form),
    });

    if (!transactionId) {
      console.warn("⚠️ Missing transaction_id");

      return NextResponse.json({ success: true });
    }

    const payment = await prisma.payment.findUnique({
      where: {
        provider_ref: transactionId,
      },
    });

    if (!payment) {
      console.warn(`⚠️ Payment not found for transaction ${transactionId}`);

      return NextResponse.json({ success: true });
    }

    // Reconciliar contra Sentoo
    const verification = await SentooService.verifySentooPayment(transactionId);

    const providerStatus = verification.status;

    console.log(
      `🔎 Sentoo verification for ${transactionId}: ${providerStatus}`,
    );

    if (providerStatus === "success") {
      /**
       * updateMany evita race conditions:
       * solo un webhook podrá cambiar el estado.
       */
      const updated = await prisma.payment.updateMany({
        where: {
          id: payment.id,
          status: {
            not: "paid",
          },
        },
        data: {
          status: "paid",
          paid_at: new Date(),
          provider_payload: JSON.stringify(verification),
        },
      });

      /**
       * Si count = 0 significa que otro webhook
       * ya procesó este pago.
       */
      if (updated.count === 0) {
        console.log(`ℹ️ Payment already processed: ${payment.id}`);

        return NextResponse.json({
          success: true,
        });
      }

      try {
        await processSuccessfulPayment(payment.id);

        console.log(`✅ Business logic processed for payment ${payment.id}`);
      } catch (error) {
        console.error(`🔥 Error processing payment ${payment.id}`, error);

        // Opcional: registrar error para soporte
        await prisma.payment.update({
          where: {
            id: payment.id,
          },
          data: {
            processing_error:
              error instanceof Error
                ? error.message
                : "Unknown processing error",
          },
        });
      }
    } else {
      await prisma.payment.update({
        where: {
          id: payment.id,
        },
        data: {
          status: providerStatus === "pending" ? "pending" : "failed",
          provider_payload: JSON.stringify(verification),
        },
      });

      console.log(
        `ℹ️ Payment ${payment.id} updated with status ${providerStatus}`,
      );
    }

    console.log(`✅ Sentoo payment synced: ${transactionId}`);
  } catch (error) {
    console.error("🔥 Sentoo webhook error:", error);
  }

  /**
   * Sentoo requiere HTTP 200
   * incluso cuando exista algún error interno.
   */
  return NextResponse.json({
    success: true,
  });
}
