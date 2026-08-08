import { NextRequest, NextResponse } from "next/server";
import { StorageService } from "@/infrastructure/storage/storage.service";
import { requireOwnerOrPlatformOwner } from "@/modules/support/services/support-guards";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const { supportMessage } = await requireOwnerOrPlatformOwner(id);
    if (!supportMessage.storageKey || !supportMessage.originalName || !supportMessage.mimeType) {
      return NextResponse.json({ error: "Geen bijlage voor dit bericht" }, { status: 404 });
    }

    const file = await StorageService.downloadFile(supportMessage.storageKey);

    return new NextResponse(Buffer.from(file), {
      headers: {
        "Content-Type": supportMessage.mimeType,
        "Content-Disposition": `attachment; filename="${supportMessage.originalName}"`,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Kon bijlage niet downloaden" },
      { status: 403 },
    );
  }
}
