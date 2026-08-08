import { prisma } from "@/lib/prisma";
import { Session } from "next-auth";
import { UserRole } from "@/shared/constants/user-role";
import { StorageService } from "@/infrastructure/storage/storage.service";
import { NotificationService } from "@/modules/notification/services/notification.service";
import { NotificationType } from "@/modules/notification/constants/notification-type";
import { DebtorService } from "@/modules/collection/services/debtor.service";
import { SupportMessageStatus } from "@/modules/support/constants/support-message";
import { CreateSupportMessageInput } from "@/modules/support/services/support.validators";

const ROLE_LABELS: Record<string, string> = {
  PLATFORM_OWNER: "CFSB",
  TENANT_ADMIN: "Beheerder",
  AGENT: "Medewerker",
  EMPLOYEE: "Medewerker",
  DEBTOR: "Schuldenaar",
  BAILIFF: "Deurwaarder",
  LAWYER: "Advocaat",
  BANK: "Bank",
};

const describeRoles = (roles: string[]) =>
  roles.map((role) => ROLE_LABELS[role] ?? role).join(", ") || "Onbekend";

export class SupportService {
  static create = async (
    data: CreateSupportMessageInput,
    session: Session,
    file?: { fileName: string; mimeType: string; size: number; buffer: Buffer },
  ) => {
    const { id: userId, tenant_id: tenantId, roles = [] } = session.user;

    // Alleen resolveerbaar voor een schuldenaar (via Person.personal_number);
    // deurwaarders/advocaten/tenant-personeel hebben geen persoonlijk
    // CFSB-nummer in het huidige schema.
    let senderCfsbNumber: string | null = null;
    if (roles.includes(UserRole.DEBTOR)) {
      senderCfsbNumber = await DebtorService.getPersonalNumberByUserId(
        userId,
        tenantId,
      );
    }

    let attachment: {
      originalName: string;
      storageKey: string;
      mimeType: string;
      size: number;
    } | null = null;

    if (file) {
      const sanitizedName = `${crypto.randomUUID()}-${file.fileName}`.replace(
        /\s+/g,
        "-",
      );
      const folder = `${tenantId}/support`;
      const storageKey = await StorageService.uploadFile(
        folder,
        sanitizedName,
        file.mimeType,
        file.buffer,
      );
      attachment = {
        originalName: file.fileName,
        storageKey,
        mimeType: file.mimeType,
        size: file.size,
      };
    }

    const supportMessage = await prisma.supportMessage.create({
      data: {
        tenantId,
        createdById: userId,
        type: data.type,
        subject: data.subject,
        caseReference: data.caseReference,
        message: data.message,
        senderName: session.user.fullname || session.user.email || "Onbekend",
        senderEmail: session.user.email ?? "",
        senderRole: describeRoles(roles),
        senderCfsbNumber,
        originalName: attachment?.originalName,
        storageKey: attachment?.storageKey,
        mimeType: attachment?.mimeType,
        size: attachment?.size,
        status: SupportMessageStatus.RECEIVED,
      },
    });

    if (process.env.ADMIN_TENANT_ID) {
      await NotificationService.notifyTenantStaff(process.env.ADMIN_TENANT_ID, {
        type: NotificationType.SUPPORT_MESSAGE_RECEIVED,
        title: "Nieuw bericht via Feedback & Ondersteuning",
        message: `${supportMessage.senderName} (${supportMessage.senderRole}) stuurde een bericht: "${supportMessage.subject}".`,
        link: `/admin/support/${supportMessage.id}`,
        entity_type: "SupportMessage",
        entity_id: supportMessage.id,
      });
    }

    return supportMessage;
  };

  static getMine = async (userId: string) => {
    return prisma.supportMessage.findMany({
      where: { createdById: userId },
      orderBy: { createdAt: "desc" },
    });
  };

  static getById = async (id: string) => {
    return prisma.supportMessage.findUnique({
      where: { id },
      include: { createdBy: true, respondedBy: true },
    });
  };

  static getAllForPlatform = async (status?: SupportMessageStatus) => {
    return prisma.supportMessage.findMany({
      where: status ? { status } : undefined,
      include: { tenant: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });
  };

  static markInProgress = async (id: string) => {
    const supportMessage = await prisma.supportMessage.findUnique({
      where: { id },
    });
    if (!supportMessage) throw new Error("Bericht niet gevonden.");
    if (supportMessage.status === SupportMessageStatus.CLOSED) {
      throw new Error("Een gesloten bericht kan niet meer gewijzigd worden.");
    }

    return prisma.supportMessage.update({
      where: { id },
      data: { status: SupportMessageStatus.IN_PROGRESS },
    });
  };

  static answer = async (id: string, response: string, actorUserId: string) => {
    const supportMessage = await prisma.supportMessage.findUnique({
      where: { id },
    });
    if (!supportMessage) throw new Error("Bericht niet gevonden.");
    if (supportMessage.status === SupportMessageStatus.CLOSED) {
      throw new Error("Een gesloten bericht kan niet meer beantwoord worden.");
    }

    const updated = await prisma.supportMessage.update({
      where: { id },
      data: {
        status: SupportMessageStatus.ANSWERED,
        response,
        respondedById: actorUserId,
        respondedAt: new Date(),
      },
    });

    await NotificationService.create({
      tenant_id: updated.tenantId,
      user_id: updated.createdById,
      type: NotificationType.SUPPORT_MESSAGE_ANSWERED,
      title: "CFSB heeft uw bericht beantwoord",
      message: `Uw bericht "${updated.subject}" heeft een antwoord van CFSB gekregen.`,
      link: `/support/${updated.id}`,
      entity_type: "SupportMessage",
      entity_id: updated.id,
    });

    return updated;
  };

  static close = async (id: string) => {
    const supportMessage = await prisma.supportMessage.findUnique({
      where: { id },
    });
    if (!supportMessage) throw new Error("Bericht niet gevonden.");

    return prisma.supportMessage.update({
      where: { id },
      data: { status: SupportMessageStatus.CLOSED },
    });
  };
}
