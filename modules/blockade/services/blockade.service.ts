import { prisma } from "@/lib/prisma";
import { CreateBlockadeInput } from "./blockade.validators";
import { Prisma } from "@prisma/client";
import { StorageService } from "@/infrastructure/storage/storage.service";
import { sendMailBlockade } from "./blockade-mail.service";
import { CollectionService } from "@/modules/collection/services/collection.service";

export class BlockadeService {
  static createBlockade = async (
    input: CreateBlockadeInput,
    tenantId: string,
  ) => {
    const blockade = await prisma.blockade.create({
      data: {
        tenantId: tenantId,
        debtorId: input.debtorId,
        reason: input.reason,
        status: input.status || "DRAFT",
        registeredAt: input.registeredAt || new Date(),
        paymentId: input.paymentId || null,
      },
    });

    return blockade;
  };

  static list = async (
    tenantId: string,
    search: string,
    page: number,
    limit: number,
  ) => {
    const pageNumber = Number(page) || 1;
    const pageSize = Number(limit) || 10;

    const whereClause: Prisma.BlockadeWhereInput = {
      tenantId,
    };

    if (search?.trim()) {
      whereClause.OR = [
        {
          debtor: {
            person: {
              first_name: {
                contains: search,
              },
            },
          },
        },
        {
          debtor: {
            person: {
              last_name: {
                contains: search,
              },
            },
          },
        },
      ];
    }

    const totalBlockades = await prisma.blockade.count();

    console.log("Total blockades:", totalBlockades);
    console.log("Tenant:", tenantId);

    const tenantBlockades = await prisma.blockade.count({
      where: {
        tenantId,
      },
    });

    console.log("Tenant blockades:", tenantBlockades);

    const skip = (pageNumber - 1) * pageSize;

    console.log(
      "Fetching blockades with where clause:",
      whereClause,
      "skip:",
      skip,
      "take:",
      pageSize,
    );

    const [items, total] = await Promise.all([
      prisma.blockade.findMany({
        where: whereClause,
        skip,
        take: pageSize,
        include: {
          debtor: {
            include: {
              person: true,
            },
          },
          originDebtClaim: {
            select: {
              reference: true,
              principalAmount: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      }),

      prisma.blockade.count({
        where: whereClause,
      }),
    ]);

    return {
      items,
      total,
      page: pageNumber,
      limit: pageSize,
    };
  };

  static getById = async (id: string) => {
    console.log("Fetching blockade with ID:", id);
    return await prisma.blockade.findUnique({
      where: { id },
      include: {
        debtor: {
          include: {
            person: true,
          },
        },
        documents: true,
      },
    });
  };

  static getByDebtorId = async (debtorId: string, tenantId: string) => {
    return prisma.blockade.findMany({
      where: { debtorId, tenantId },
      orderBy: { registeredAt: "desc" },
    });
  };

  static createFull = async (input: CreateBlockadeInput, tenantId: string) => {
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

    const blockade = await prisma.$transaction(async (tx) => {
      // Een directe blokkade registreert een openstaande vordering; deze wordt
      // vastgelegd als DebtClaim (zonder verplichtingen/AOP-activatie — de
      // blokkade zelf is de actie) en gekoppeld via originDebtClaimId.
      const reference = await CollectionService.generateClaimReference(tx, {
        prefix: "BLK",
        origin: "BLK",
      });

      const debtClaim = await tx.debtClaim.create({
        data: {
          tenantId,
          debtorId: input.debtorId,
          reference,
          principalAmount: input.amount,
          currency: "USD",
          origin: "BLK",
          status: "OPEN",
        },
      });

      return tx.blockade.create({
        data: {
          tenantId,
          debtorId: input.debtorId,
          reason: input.reason,
          registeredAt: input.registeredAt || new Date(),
          status: input.status || "DRAFT",
          paymentId: input.paymentId || null,
          originDebtClaimId: debtClaim.id,
        },
      });
    });

    const uploadedDocs = await Promise.all(
      input.documents.map(async (doc: any) => {
        const file: File = doc.file;
        const key = `${tenantId}/blockades/${blockade.id}/${crypto.randomUUID()}-${doc.fileName}`;
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

    return {
      success: true,
      id: blockade.id,
      debtorEmail: debtor.email,
      debtorName: `${debtor.person?.first_name} ${debtor.person?.last_name}`,
      creditorName: debtor.tenant?.name || "",
    };
  };

  static generateReferenceNumber = async () => {
    const year = new Date().getFullYear();

    const total = await prisma.blockade.count();

    return `BLK-${year}-${String(total + 1).padStart(3, "0")}`;
  };

  static updatePaymentReference = async (
    blockadeId: string,
    input: { paymentId: string },
  ) => {
    const blockade = await prisma.blockade.update({
      where: { id: blockadeId },
      data: {
        paymentId: input.paymentId,
      },
    });

    const debtor = await prisma.debtor.findUnique({
      where: { id: blockade.debtorId },
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

    return {
      success: true,
      id: blockade.id,
      debtorEmail: debtor.email,
      debtorName: `${debtor.person?.first_name} ${debtor.person?.last_name}`,
      creditorName: debtor.tenant?.name || "",
    };
  };

  // Suspende temporalmente el/los bloqueo(s) ACTIVE de este deudor con este
  // tenant cuando se acepta un acuerdo de pago. releasedAt se limpia porque
  // BlockCheckService (y ahora también el reporte financiero) usan ese campo
  // como única señal de "está bloqueado" en tiempo real.
  static suspendActiveForDebtor = async (debtorId: string, tenantId: string) => {
    const blockades = await prisma.blockade.findMany({
      where: { debtorId, tenantId, status: "ACTIVE" },
    });
    if (blockades.length === 0) return [];

    await prisma.blockade.updateMany({
      where: { id: { in: blockades.map((b) => b.id) } },
      data: { status: "SUSPENDED", releasedAt: new Date() },
    });

    return blockades;
  };

  // Reactiva un bloqueo SUSPENDED (incumplimiento del acuerdo de pago) y
  // envía la notificación de bloqueo al deudor, igual que en el resto del
  // flujo de blokkade.
  static reactivate = async (blockadeId: string) => {
    const blockade = await prisma.blockade.findUnique({
      where: { id: blockadeId },
      include: { debtor: { include: { person: true, tenant: true } } },
    });
    if (!blockade || blockade.status !== "SUSPENDED") return null;

    await prisma.blockade.update({
      where: { id: blockadeId },
      data: { status: "ACTIVE", releasedAt: null },
    });

    if (blockade.debtor.email) {
      await sendMailBlockade(
        blockade.debtor.email,
        `${blockade.debtor.person?.first_name ?? ""} ${blockade.debtor.person?.last_name ?? ""}`.trim(),
        blockade.debtor.tenant?.name || "",
      );
    }

    return blockade;
  };

  static getSuspended = async () => {
    return prisma.blockade.findMany({
      where: { status: "SUSPENDED" },
      include: { debtor: true },
    });
  };

  static processBlokCheckPayment = async (paymentId: string) => {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new Error("Payment not found");
    }

    if (payment.status !== "paid") {
      throw new Error("Payment is not marked as paid");
    }

    const blockade = await prisma.blockade.findFirst({
      where: { paymentId: payment.id, status: "DRAFT" },
      include: {
        debtor: {
          include: {
            person: true,
            tenant: true,
          },
        },
      },
    });

    if (!blockade) {
      throw new Error("Blockade not found");
    }

    // Aquí puedes agregar la lógica específica para procesar el pago de la blokkade
    await prisma.blockade.update({
      where: { id: blockade.id },
      data: { status: "ACTIVE" },
    });

    sendMailBlockade(
      blockade.debtor.email!,
      `${blockade.debtor.person?.first_name} ${blockade.debtor.person?.last_name}`,
      blockade.debtor.tenant?.name || "",
    );

    return { success: true };
  };
}
