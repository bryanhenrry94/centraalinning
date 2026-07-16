"use server";

import { CollectionNotificationService } from "@/modules/collection/services/collection-notification.service";

export async function getAopStepsForClaim(debtClaimId: string) {
  return CollectionNotificationService.getStepsForClaim(debtClaimId);
}

export async function sendAopNotification(debtClaimId: string) {
  return CollectionNotificationService.sendNotification(debtClaimId);
}
