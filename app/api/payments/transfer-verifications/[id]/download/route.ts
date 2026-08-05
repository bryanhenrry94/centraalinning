import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StorageService } from "@/infrastructure/storage/storage.service";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenant_id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const verification = await prisma.paymentTransferVerification.findUnique({
      where: { id },
      include: { payment: { include: { obligation: { include: { debtClaim: true } } } } },
    });
    if (!verification) {
      return NextResponse.json({ error: "Bewijsstuk niet gevonden" }, { status: 404 });
    }
    if (verification.payment.obligation?.debtClaim.tenantId !== session.user.tenant_id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const file = await StorageService.downloadFile(verification.receipt_file_path);

    return new NextResponse(Buffer.from(file), {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${verification.receipt_file_name}"`,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Kon bewijsstuk niet downloaden" },
      { status: 500 },
    );
  }
}
