import { prisma } from "@/lib/prisma";
import { Prisma, TimelineEvent } from "@prisma/client";

export class ClaimTimelineService {
  static async logEvent(
    debtClaimId: string,
    event: TimelineEvent,
    description?: string,
    metadata?: Prisma.InputJsonValue,
  ) {
    return prisma.claimTimeline.create({
      data: {
        debtClaimId,
        event,
        description,
        metadata,
      },
    });
  }
}
