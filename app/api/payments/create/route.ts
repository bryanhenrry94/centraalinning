import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PaymentService } from "@/modules/payment/services/payment.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.amount || !body.currency) {
      return NextResponse.json(
        { message: "Amount and currency are required" },
        { status: 400 },
      );
    }

    const session = await getServerSession(authOptions);

    if (!session?.user?.tenant_id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const payload = {
      amount: body.amount,
      currency: body.currency,
      description: body.description || "Payment",
      reference: body.reference,
      payment_type: body.payment_type,
    };

    // registrar payment y crear transacción con sentoo
    const paymentRes = await PaymentService.create(
      session.user.tenant_id,
      payload,
    );

    return NextResponse.json({
      success: true,
      paymentId: paymentRes.data?.paymentId,
      paymentUrl: paymentRes.data?.paymentUrl || null,
    });
  } catch (error: any) {
    console.error("Error creating payment:", error);
    return NextResponse.json(
      {
        error: "Failed to create payment",
      },
      {
        status: 500,
      },
    );
  }
}
