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
    const confirmation = await prisma.gopPaymentConfirmation.findUnique({ where: { id } });
    if (!confirmation) {
      return NextResponse.json({ error: "Betalingsregistratie niet gevonden" }, { status: 404 });
    }

    await requireStaffOrAssignedBailiff(confirmation.legalProcessId);

    const file = await StorageService.downloadFile(confirmation.proofStorageKey);

    return new NextResponse(Buffer.from(file), {
      headers: {
        "Content-Type": confirmation.proofMimeType,
        "Content-Disposition": `attachment; filename="${confirmation.proofOriginalName}"`,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Kon bewijsstuk niet downloaden" },
      { status: 403 },
    );
  }
}
