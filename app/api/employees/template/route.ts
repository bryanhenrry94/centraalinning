import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";

export async function GET() {
  try {
    // Ruta del archivo dentro de tu proyecto
    const filePath = path.join(
      process.cwd(),
      "public",
      "templates",
      "employees-template.xlsx"
    );

    console.log("File path:", filePath);

    // Verifica que el archivo exista
    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: "Archivo de plantilla no encontrado" },
        { status: 404 }
      );
    }

    // Lee el archivo como Buffer
    const fileBuffer = fs.readFileSync(filePath);

    // Devuelve el archivo con los encabezados correctos
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Disposition": 'attachment; filename="employees-template.xlsx"',
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });
  } catch (error) {
    console.error("Error al obtener la plantilla:", error);
    return NextResponse.json(
      { error: "Error al generar la plantilla" },
      { status: 500 }
    );
  }
}
