// app/api/contracts/upload/route.ts

import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export async function POST(req: NextRequest) {
  const data = await req.formData();

  const file = data.get("file") as File;
  const contractId = data.get("contractId") as string;

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const uploadDir = path.join(process.cwd(), "uploads", contractId);

  await fs.mkdir(uploadDir, { recursive: true });

  const filePath = path.join(uploadDir, file.name);

  await fs.writeFile(filePath, buffer);

  return NextResponse.json({
    success: true,
    fileName: file.name,
  });
}
