"use server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NotificationService } from "@/modules/notification/services/notification.service";
import { Notification } from "@/modules/notification/services/notification.validators";

// Todas las acciones se resuelven contra la sesión activa: un usuario nunca
// puede leer o marcar como leídas las notificaciones de otro usuario/tenant.
async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.tenant_id) {
    throw new Error("U bent niet ingelogd.");
  }
  return { user_id: session.user.id, tenant_id: session.user.tenant_id };
}

export const getMyNotifications = async (options?: {
  onlyUnread?: boolean;
  take?: number;
}): Promise<Notification[]> => {
  const { user_id, tenant_id } = await requireSession();
  return NotificationService.getForUser(user_id, tenant_id, options);
};

export const getMyUnreadNotificationCount = async (): Promise<number> => {
  const { user_id, tenant_id } = await requireSession();
  return NotificationService.countUnread(user_id, tenant_id);
};

export const deleteNotification = async (id: string): Promise<void> => {
  const { user_id } = await requireSession();
  await NotificationService.delete(id, user_id);
};

export const deleteAllNotifications = async (): Promise<void> => {
  const { user_id, tenant_id } = await requireSession();
  await NotificationService.deleteAll(user_id, tenant_id);
};
