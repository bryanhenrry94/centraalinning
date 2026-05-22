import { sendFinancialReportMail } from "@/actions/email";
import { verifySentooPayment } from "@/actions/sentoo.actions";
import { MembershipStatus } from "@/constants/membership-status";
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

      // Busca si tiene un Membership pendiente y actívalo
      const tenant = await prisma.tenant.findUnique({
        where: { id: payment.tenant_id },
        include: {
          memberships: {
            where: { status: "PENDING" },
          },
        },
      });

      if (tenant?.memberships.length) {
        await prisma.membership.update({
          where: { id: tenant.memberships[0].id },
          data: {
            status: MembershipStatus.ACTIVE,
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 días
          },
        });

        console.log("✅ Membership activated for tenant:", tenant.id);
      }

      // Valida si el pago tiene una solicitud de blok-check y actualiza el estado del has_blokcheck
      const blokCheck = await prisma.blokCheckRequest.findFirst({
        where: { payment_id: payment.id },
      });

      if (blokCheck) {
        let _has_blockade: boolean = false;

        // consulta en la tabla person por la identificacion y obtiene si la persona tiene un bloqueo
        const person = await prisma.person.findUnique({
          where: { identification: blokCheck.document_number },
        });

        if (person) {
          _has_blockade = person.has_blockade ? person.has_blockade : false;
        }

        await prisma.blokCheckRequest.update({
          where: { id: blokCheck.id },
          data: { has_blockade: _has_blockade, payment_status: "paid" },
        });
      }

      // Valida si el pago tiene una solicitud de reporte financiero y actualiza el estado del payment_status
      const financialReportRequest =
        await prisma.financialReportRequest.findFirst({
          where: { payment_id: payment.id },
        });

      if (financialReportRequest) {
        await prisma.financialReportRequest.update({
          where: { id: financialReportRequest.id },
          data: { payment_status: "paid" },
        });

        await sendFinancialReportMail(financialReportRequest.id);
      }
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
