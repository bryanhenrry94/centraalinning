// app/api/upload/route.ts

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const ALLOWED_TYPES = [
  // PDF
  "application/pdf",

  // Imágenes
  "image/png",
  "image/jpeg",
  "image/jpg",

  // Word
  "application/msword", // .doc
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx

  // Excel
  "application/vnd.ms-excel", // .xls
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
];

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const file = formData.get("file") as File | null;
    const contractId = formData.get("contractId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error: "Only PDF, PNG and JPG files are allowed",
        },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: "Maximum file size is 10 MB",
        },
        { status: 400 },
      );
    }

    const timestamp = Date.now();

    const sanitizedName = file.name
      .replace(/\s+/g, "-")
      .replace(/[^\w.-]/g, "");

    const filePath = contractId
      ? `contracts/${contractId}/${timestamp}-${sanitizedName}`
      : `temp/${timestamp}-${sanitizedName}`;

    const { error } = await supabaseAdmin.storage
      .from("cfsb-storage")
      .upload(filePath, file, {
        upsert: false,
        contentType: file.type,
      });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      fileName: file.name,
      filePath,
      size: file.size,
      mimeType: file.type,
    });
  } catch (error) {
    console.error("Upload error:", error);

    return NextResponse.json(
      {
        error: "Failed to upload file",
      },
      { status: 500 },
    );
  }
}
