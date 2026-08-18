import { prisma } from "@/lib/prisma";
import { UserRole } from "@/shared/constants/user-role";
import { CreateNotification, Notification } from "@/modules/notification/services/notification.validators";

const STAFF_ROLES: UserRole[] = [
  UserRole.PLATFORM_OWNER,
  UserRole.TENANT_ADMIN,
  UserRole.AGENT,
  UserRole.EMPLOYEE,
  UserRole.BAILIFF,
  UserRole.LAWYER,
  UserRole.BANK,
];

const mapNotification = (n: any): Notification => ({
  id: n.id,
  tenant_id: n.tenant_id,
  user_id: n.user_id,
  type: n.type,
  title: n.title,
  message: n.message,
  link: n.link ?? undefined,
  entity_type: n.entity_type ?? undefined,
  entity_id: n.entity_id ?? undefined,
  is_read: n.is_read,
  read_at: n.read_at ?? undefined,
  created_at: n.created_at,
});

export class NotificationService {
  static async create(data: CreateNotification): Promise<Notification> {
    const created = await prisma.notification.create({ data });
    return mapNotification(created);
  }

  static async createMany(
    userIds: string[],
    data: Omit<CreateNotification, "user_id">,
  ): Promise<void> {
    if (userIds.length === 0) return;
    await prisma.notification.createMany({
      data: userIds.map((user_id) => ({ ...data, user_id })),
    });
  }

  // Notifica a todo el personal activo del tenant (excluye deudores), útil
  // para eventos que el cliente/tenant debe revisar (p.ej. una solicitud de
  // acuerdo de pago).
  static async notifyTenantStaff(
    tenant_id: string,
    data: Omit<CreateNotification, "user_id" | "tenant_id">,
    options?: { excludeUserId?: string },
  ): Promise<void> {
    const staff = await prisma.user.findMany({
      where: {
        memberships: {
          some: {
            tenant_id,
            status: "ACTIVE",
            roles: { some: { role: { in: STAFF_ROLES } } },
          },
        },
      },
      select: { id: true },
    });

    const userIds = staff
      .map((u) => u.id)
      .filter((id) => id !== options?.excludeUserId);

    await this.createMany(userIds, { ...data, tenant_id });
  }

  // Difunde a todo el personal activo de varios tenants a la vez — usado
  // por el broadcast de red de COP (una pregunta a toda la red, no a un
  // solo tenant). Reusa notifyTenantStaff en vez de reinventar el fan-out
  // a staff por tenant.
  static async notifyManyTenants(
    tenantIds: string[],
    data: Omit<CreateNotification, "user_id" | "tenant_id">,
  ): Promise<void> {
    await Promise.all(tenantIds.map((tenant_id) => this.notifyTenantStaff(tenant_id, data)));
  }

  static async getForUser(
    user_id: string,
    tenant_id: string,
    options?: { onlyUnread?: boolean; take?: number },
  ): Promise<Notification[]> {
    const notifications = await prisma.notification.findMany({
      where: {
        user_id,
        tenant_id,
        ...(options?.onlyUnread ? { is_read: false } : {}),
      },
      orderBy: { created_at: "desc" },
      take: options?.take ?? 20,
    });
    return notifications.map(mapNotification);
  }

  static async countUnread(user_id: string, tenant_id: string): Promise<number> {
    return prisma.notification.count({
      where: { user_id, tenant_id, is_read: false },
    });
  }

  // Las notificaciones son de un solo uso: se eliminan al abrirlas o al
  // cerrarlas manualmente, en vez de acumularse marcadas como leídas.
  static async delete(id: string, user_id: string): Promise<void> {
    await prisma.notification.deleteMany({ where: { id, user_id } });
  }

  static async deleteAll(user_id: string, tenant_id: string): Promise<void> {
    await prisma.notification.deleteMany({ where: { user_id, tenant_id } });
  }
}
