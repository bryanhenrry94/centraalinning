// app/api/contracts/documents/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface UploadedDocument {
  fileName: string;
  filePath: string;
  mimeType: string;
  size: number;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      contractId,
      documents,
    }: {
      contractId: string;
      documents: UploadedDocument[];
    } = body;

    if (!contractId) {
      return NextResponse.json(
        {
          error: "contractId is required",
        },
        {
          status: 400,
        },
      );
    }

    if (!Array.isArray(documents) || documents.length === 0) {
      return NextResponse.json(
        {
          error: "documents are required",
        },
        {
          status: 400,
        },
      );
    }

    const result = await prisma.contractDocument.createMany({
      data: documents.map((doc) => ({
        contract_id: contractId,
        file_name: doc.fileName,
        file_path: doc.filePath,
        mime_type: doc.mimeType,
        file_size: doc.size,
      })),
    });

    return NextResponse.json({
      success: true,
      count: result.count,
    });
  } catch (error) {
    console.error("Error saving contract documents:", error);

    return NextResponse.json(
      {
        error: "Failed to save contract documents",
      },
      {
        status: 500,
      },
    );
  }
}
