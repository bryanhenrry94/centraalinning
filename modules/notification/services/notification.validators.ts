import { z } from "zod";
import { NotificationType } from "@/modules/notification/constants/notification-type";

export const notificationSchema = z.object({
  id: z.string().cuid(),
  tenant_id: z.string().uuid(),
  user_id: z.string().uuid(),
  type: z.nativeEnum(NotificationType),
  title: z.string(),
  message: z.string(),
  link: z.string().optional().nullable(),
  entity_type: z.string().optional().nullable(),
  entity_id: z.string().optional().nullable(),
  is_read: z.boolean(),
  read_at: z.date().optional().nullable(),
  created_at: z.date(),
});

export const createNotificationSchema = notificationSchema.omit({
  id: true,
  is_read: true,
  read_at: true,
  created_at: true,
});

export type Notification = z.infer<typeof notificationSchema>;
export type CreateNotification = z.infer<typeof createNotificationSchema>;

// Estado de un paso del workflow AOP (Aanmaning/Sommatie/...), no relacionado
// con las notificaciones in-app de usuario definidas arriba.
export const AOPStepNotificationSchema = z.object({
  id: z.string().cuid(),
  collectionId: z.string().cuid(),
  step: z.enum(["REMINDER", "FINAL_NOTICE", "DEFAULT_NOTICE", "BLK_NOTIFICATION"]),
  deadline: z.date().optional().nullable(),
  sentAt: z.date().optional().nullable(),
  completedAt: z.date().optional().nullable(),
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"]),
});

export type AOPStepNotification = z.infer<typeof AOPStepNotificationSchema>;
