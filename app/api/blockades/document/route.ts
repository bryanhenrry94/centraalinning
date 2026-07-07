import { NextResponse } from "next/server";
import { StorageService } from "@/infrastructure/storage/storage.service";

export async function GET() {
  try {
    const filePath =
      "tenants/1/documents/2024/6/document.xlsx";

    const file = await StorageService.downloadFile(filePath);

    return new NextResponse(Buffer.from(file), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition":
          'attachment; filename="document.xlsx"',
      },
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error: "No se pudo descargar la plantilla",
      },
      {
        status: 500,
      },
    );
  }
}
