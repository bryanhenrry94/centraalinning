import { prisma } from "@/lib/prisma";
import { Payment } from "@prisma/client";

export const processSubscriptionPayment = async (payment: Payment) => {
  console.log("Processing subscription payment:", payment.id);

  await prisma.$transaction(async (tx) => {
    const membership = await tx.membership.findFirst({
      where: {
        tenant_id: payment.tenant_id,
        status: "PENDING",
      },
      orderBy: {
        created_at: "desc",
      },
    });

    if (membership) {
      await tx.membership.update({
        where: {
          id: membership.id,
        },
        data: {
          status: "ACTIVE",
        },
      });
    }

    const subscription = await tx.subscription.findFirst({
      where: {
        tenant_id: payment.tenant_id,
        status: "PENDING",
      },
      orderBy: {
        created_at: "desc",
      },
    });

    if (subscription) {
      await tx.subscription.update({
        where: {
          id: subscription.id,
        },
        data: {
          status: "ACTIVE",
          activated_at: new Date(),
        },
      });
    }
  });

  console.log("✅ Subscription activated for tenant:", payment.tenant_id);
};
