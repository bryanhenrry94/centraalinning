import { prisma } from "@/lib/prisma";
import { CreateBlockadeInput } from "./blockade.validators";
import { Prisma } from "@prisma/client";
import { StorageService } from "@/infrastructure/storage/storage.service";
import { sendMailBlockade } from "./blockade-mail.service";
import { CollectionService } from "@/modules/collection/services/collection.service";
import { REASONS } from "@/modules/blockade/constants/reason-blockades";
import { ClaimTimelineService } from "@/modules/collection/services/claim-timeline.service";
import { NotificationService } from "@/modules/notification/services/notification.service";
import { NotificationType } from "@/modules/notification/constants/notification-type";

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

  static createFull = async (
    input: CreateBlockadeInput,
    tenantId: string,
    actorUserId?: string,
  ) => {
    const debtor = await prisma.debtor.findUnique({
      where: { id: input.debtorId },
      include: { person: true, tenant: true },
    });

    if (!debtor) {
      return { success: false, message: "Debiteur niet gevonden" };
    }

    if (!debtor.email || !debtor.person.email) {
      return {
        success: false,
        message: "De debiteur heeft geen gekoppeld e-mailadres",
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

      const createdBlockade = await tx.blockade.create({
        data: {
          tenantId,
          debtorId: input.debtorId,
          reason: input.reason,
          reasonNote: input.reasonNote,
          registeredAt: input.registeredAt || new Date(),
          status: input.status || "DRAFT",
          paymentId: input.paymentId || null,
          originDebtClaimId: debtClaim.id,
        },
      });

      // Registro de auditoría de la ruta directa: quién la registró, con
      // qué motivo y con cuántos documentos de respaldo — bypassa AOP/GOP,
      // así que este es el único rastro de verificación previa que existe.
      const reasonLabel = REASONS.find((r) => r.value === input.reason)?.label ?? input.reason;
      await tx.claimTimeline.create({
        data: {
          debtClaimId: debtClaim.id,
          event: "BLOCKADE_REGISTERED",
          description: `Bloqueo económico registrado directamente. Motivo: ${reasonLabel}.${
            input.reasonNote ? ` ${input.reasonNote}` : ""
          } Confirmado por el usuario, ${input.documents.length} documento(s) adjunto(s).`,
          metadata: {
            reason: input.reason,
            reasonNote: input.reasonNote ?? null,
            documentsCount: input.documents.length,
          },
          createdById: actorUserId,
        },
      });

      return createdBlockade;
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
      return { success: false, message: "Debiteur niet gevonden" };
    }

    if (!debtor.email || !debtor.person.email) {
      return {
        success: false,
        message: "De debiteur heeft geen gekoppeld e-mailadres",
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

  // Se llama cuando UN expediente puntual (p.ej. un GOP) queda saldado en
  // su totalidad. A diferencia de suspendActiveForDebtor (que suspende
  // TODOS los bloqueos activos de un deudor+tenant sin distinguir causa),
  // esto libera ÚNICAMENTE el bloqueo cuyo origen es este debtClaim — y
  // solo si, además, no existe ningún OTRO bloqueo activo para la misma
  // persona (verificado a través de todos sus Debtor, en cualquier
  // tenant — misma consulta que BlockCheckService). El bloqueo económico
  // solo se considera efectivamente levantado cuando ya no queda ninguna
  // razón vigente.
  static releaseForSettledDebtClaim = async (
    debtClaimId: string,
    debtorId: string,
    tenantId: string,
    actorUserId?: string,
  ) => {
    const blockade = await prisma.blockade.findFirst({
      where: { originDebtClaimId: debtClaimId, status: "ACTIVE" },
    });
    if (!blockade) return null;

    const updated = await prisma.blockade.update({
      where: { id: blockade.id },
      data: { status: "SUSPENDED", releasedAt: new Date() },
    });

    const debtor = await prisma.debtor.findUnique({ where: { id: debtorId } });

    const otherActiveBlockade = debtor
      ? await prisma.blockade.findFirst({
          where: {
            id: { not: blockade.id },
            status: "ACTIVE",
            debtor: { person_id: debtor.person_id },
          },
        })
      : null;

    if (otherActiveBlockade) {
      await ClaimTimelineService.logEvent(
        debtClaimId,
        "BLOCKADE_RELEASED",
        "Dit dossier is volledig voldaan en het bijbehorende bloqueo werd opgeheven, maar de persoon blijft geblokkeerd wegens een ander openstaand dossier.",
        { blockadeId: updated.id, otherActiveBlockadeId: otherActiveBlockade.id },
        actorUserId,
      );
      return updated;
    }

    await ClaimTimelineService.logEvent(
      debtClaimId,
      "BLOCKADE_RELEASED",
      "Dit dossier is volledig voldaan. Geen andere actieve bloqueos gevonden — de economische blokkade is volledig opgeheven.",
      { blockadeId: updated.id },
      actorUserId,
    );

    if (debtor?.user_id) {
      await NotificationService.create({
        tenant_id: tenantId,
        user_id: debtor.user_id,
        type: NotificationType.BLOCKADE_SUSPENDED,
        title: "Economische blokkade opgeheven",
        message: "Uw schuld werd volledig voldaan en u heeft geen andere actieve blokkades: uw economische blokkade werd opgeheven.",
        link: "/block-status",
        entity_type: "Blockade",
        entity_id: updated.id,
      });
    }

    return updated;
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
      throw new Error("Betaling niet gevonden");
    }

    if (payment.status !== "paid") {
      throw new Error("De betaling is niet als betaald gemarkeerd");
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
      throw new Error("Blokkade niet gevonden");
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
