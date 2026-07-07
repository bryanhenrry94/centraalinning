import { NextRequest } from "next/server";

import { StorageService } from "@/infrastructure/storage/storage.service";
import { ContractDocumentService } from "@/modules/contract/services/contract-document.service";

export async function GET(
  _req: NextRequest,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  },
) {
  const { id } = await params;

  const document = await ContractDocumentService.getById(id);

  if (!document) {
    return new Response("Document not found", {
      status: 404,
    });
  }

  try {
    const file = await StorageService.downloadFileSup(document.file_path);

    return new Response(file.stream(), {
      headers: {
        "Content-Type": document.mime_type,
        "Content-Disposition": `attachment; filename="${document.file_name}"`,
      },
    });
  } catch (error) {
    console.error(error);

    return new Response("Error downloading file", {
      status: 500,
    });
  }
}
