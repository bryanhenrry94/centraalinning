import { verifySentooPayment } from "@/actions/sentoo.actions";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();

    const transactionId = form.get("transaction_id");

    console.log("📩 Sentoo webhook received:", {
      transactionId,
      raw: Object.fromEntries(form),
    });

    if (!transactionId) {
      console.warn("⚠️ Missing transaction_id");
      return NextResponse.json({ success: true });
    }

    const payment = await prisma.payment.findUnique({
      where: { provider_ref: transactionId.toString() },
    });

    if (!payment) {
      console.warn("⚠️ Payment not found:", transactionId);
      return NextResponse.json({ success: true });
    }

    if (payment.status === "paid") {
      console.log("Already processed:", transactionId);
      return NextResponse.json({ success: true });
    }

    // 🔒 Reconciliar contra Sentoo
    const verification = await verifySentooPayment(transactionId.toString());

    const status = verification.status;

    if (status === "success") {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "paid",
          provider_status: "success",
          paid_at: new Date(),
        },
      });
    } else {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: status,
          provider_status: status,
        },
      });
    }

    console.log("✅ Sentoo payment synced:", transactionId);
  } catch (err) {
    console.error("🔥 Sentoo webhook error:", err);
  }

  // ⚠️ Sentoo exige 200 siempre
  return NextResponse.json({ success: true });
}
