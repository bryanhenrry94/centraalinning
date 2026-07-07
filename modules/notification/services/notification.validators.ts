import { z } from "zod";

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
