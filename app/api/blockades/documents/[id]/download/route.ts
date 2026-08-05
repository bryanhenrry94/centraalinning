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

    const document = await prisma.blockadeDocument.findUnique({
      where: { id },
      include: { blockade: true },
    });
    if (!document) {
      return NextResponse.json({ error: "Document niet gevonden" }, { status: 404 });
    }
    if (document.blockade.tenantId !== session.user.tenant_id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

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
      { status: 500 },
    );
  }
}
