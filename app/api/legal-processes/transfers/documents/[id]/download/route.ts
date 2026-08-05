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
    const document = await prisma.caseTransferDocument.findUnique({ where: { id } });
    if (!document) {
      return NextResponse.json({ error: "Document niet gevonden" }, { status: 404 });
    }

    await requireStaffOrAssignedLawyerOrBailiffForTransfer(document.caseTransferId);

    const file = await StorageService.downloadFile(document.storageKey);

    return new NextResponse(Buffer.from(file), {
      headers: {
        "Content-Type": document.mimeType,
        "Content-Disposition": `attachment; filename="${document.originalName}"`,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Kon document niet downloaden" },
      { status: 403 },
    );
  }
}
