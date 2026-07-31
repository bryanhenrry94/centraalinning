import { prisma } from "@/lib/prisma";
import { Prisma, TimelineEvent } from "@prisma/client";

export class ClaimTimelineService {
  static async getForDebtClaim(debtClaimId: string) {
    return prisma.claimTimeline.findMany({
      where: { debtClaimId },
      include: { createdBy: { select: { id: true, fullname: true, email: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  static async logEvent(
    debtClaimId: string,
    event: TimelineEvent,
    description?: string,
    metadata?: Prisma.InputJsonValue,
    createdById?: string,
  ) {
    return prisma.claimTimeline.create({
      data: {
        debtClaimId,
        event,
        description,
        metadata,
        createdById,
      },
    });
  }
}
