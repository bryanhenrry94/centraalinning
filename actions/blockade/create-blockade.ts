"use server";

import { prisma } from "@/lib/prisma";
// import { uploadToR2 } from "@/lib/uploadToR2";
import { CreateBlockadeInput } from "@/services/blockade/blockade.validators";
import { StorageService } from "@/services/storage/storage.service";
import { Prisma } from "@prisma/client";
import { sendMailBlockade } from "../email";
import { BlockadeService } from "@/services/blockade/blockade.service";

type CreateBlockadeResponse = {
  success: boolean;
  message?: string;
  id?: string;
};

export async function createBlockadeAction(
  input: CreateBlockadeInput,
  tenantId: string,
): Promise<CreateBlockadeResponse> {
  try {
    const debtor = await prisma.debtor.findUnique({
      where: { id: input.debtorId },
      include: { person: true, tenant: true },
    });

    if (!debtor) {
      return { success: false, message: "Deudor no encontrado" };
    }

    if (!debtor.email || !debtor.person.email) {
      return {
        success: false,
        message: "El deudor no tiene un correo electrónico asociado",
      };
    }

    // Generar un número de referencia único para la nueva blockade
    const referenceNumber = await BlockadeService.generateReferenceNumber();

    // 1. crear bloqueo
    const blockade = await prisma.blockade.create({
      data: {
        tenantId,
        debtorId: input.debtorId,
        amount: new Prisma.Decimal(input.amount),
        reason: input.reason,
        registeredAt: input.registeredAt || new Date(),
        status: "ACTIVE",
        reference_number: referenceNumber,
      },
    });

    // 2. subir documentos en paralelo
    const uploadedDocs = await Promise.all(
      input.documents.map(async (doc: any) => {
        const file: File = doc.file;

        const key = `${tenantId}/blockades/${blockade.id}/${crypto.randomUUID()}-${doc.fileName}`;

        // convertir File a Buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        await StorageService.uploadFile(
          key,
          doc.fileName,
          doc.mimeType,
          buffer,
        );

        return {
          blockadeId: blockade.id,
          fileName: doc.fileName,
          originalName: doc.originalName,
          mimeType: doc.mimeType,
          size: doc.size,
          storageKey: key,
        };
      }),
    );

    // 3. guardar documentos en DB
    await prisma.blockadeDocument.createMany({
      data: uploadedDocs.map((doc) => ({
        blockadeId: blockade.id,
        fileName: doc.fileName,
        originalName: doc.originalName,
        mimeType: doc.mimeType,
        size: doc.size,
        storageKey: doc.storageKey,
      })),
    });

    // envia correo de bloqueo al deudor
    const creditorName = debtor.tenant?.name || "";

    sendMailBlockade(
      debtor?.email || "",
      `${debtor?.person?.first_name} ${debtor?.person?.last_name}` || "",
      creditorName,
    );

    return { success: true, id: blockade.id };
  } catch (error: any) {
    console.error(error);
    return {
      success: false,
      message: error?.message || "Error creating blockade",
    };
  }
}
