import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { StorageService } from "@/infrastructure/storage/storage.service";
import { requireStaffOrAssignedLawyerOrBailiffForTransfer } from "@/modules/legal-process/services/case-transfer-guards";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const invoice = await prisma.lawyerFeeInvoice.findUnique({ where: { id } });
    if (!invoice) {
      return NextResponse.json({ error: "Factuur niet gevonden" }, { status: 404 });
    }

    await requireStaffOrAssignedLawyerOrBailiffForTransfer(invoice.caseTransferId);

    const file = await StorageService.downloadFile(invoice.storageKey);

    return new NextResponse(Buffer.from(file), {
      headers: {
        "Content-Type": invoice.mimeType,
        "Content-Disposition": `attachment; filename="${invoice.originalName}"`,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Kon factuur niet downloaden" },
      { status: 403 },
    );
  }
}
