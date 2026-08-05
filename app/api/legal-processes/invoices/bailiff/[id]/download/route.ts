import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { StorageService } from "@/infrastructure/storage/storage.service";
import { requireStaffOrAssignedBailiff } from "@/modules/legal-process/services/legal-process-guards";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const invoice = await prisma.bailiffFeeInvoice.findUnique({ where: { id } });
    if (!invoice) {
      return NextResponse.json({ error: "Factuur niet gevonden" }, { status: 404 });
    }

    await requireStaffOrAssignedBailiff(invoice.legalProcessId);

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
