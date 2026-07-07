import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { PaymentService } from "@/modules/payment/services/payment.service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.tenant_id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { message: "Payment ID is required" },
        { status: 400 },
      );
    }

    // Idealmente este método debe validar tenant + id
    const payment = await PaymentService.getByIdForTenant(
      id,
      session.user.tenant_id,
    );

    if (!payment) {
      return NextResponse.json(
        { message: "Payment not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      id: payment.id,
      status: payment.status,
      paid: payment.status === "paid",
    });
  } catch (error) {
    console.error("Error checking payment status:", error);

    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
