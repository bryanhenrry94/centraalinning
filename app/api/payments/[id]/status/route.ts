import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { PaymentService } from "@/modules/payment/services/payment.service";
import { UserRole } from "@/shared/constants/user-role";

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

    const payment = await PaymentService.getByIdWithAssignedParty(id);

    if (!payment) {
      return NextResponse.json(
        { message: "Payment not found" },
        { status: 404 },
      );
    }

    // El pago vive bajo el tenant del acreedor, pero el abogado/alguacil que
    // paga la comisión CFSB (GOP_LAWYER_FEE/GOP_BAILIFF_FEE) está autenticado
    // bajo su propio tenant — ver PaymentService.getByIdWithAssignedParty.
    const isTenantStaff = session.user.tenant_id === payment.tenant_id;
    const isPlatformOwner = !!session.user.roles?.includes(UserRole.PLATFORM_OWNER);
    const isAssignedLawyer =
      payment.lawyer_fee_invoice?.caseTransfer.lawyer?.userId === session.user.id;
    const isAssignedBailiff =
      payment.bailiff_fee_invoice?.legalProcess.bailiff?.user_id === session.user.id ||
      payment.legal_process_activation?.bailiff?.user_id === session.user.id;

    if (!isTenantStaff && !isPlatformOwner && !isAssignedLawyer && !isAssignedBailiff) {
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
