import { prisma } from "@/lib/prisma";
import { Payment } from "@prisma/client";
import { sendInvoiceEmail } from "./payment-mail.service";
import { InvoiceService } from "./invoice-service";
import { sendWelcomeEmail } from "@/modules/auth/services/auth-mail.service";

export const processSubscriptionPayment = async (payment: Payment) => {
  console.log("Processing subscription payment:", payment.id);

  const tenant = await prisma.tenant.findUnique({
    where: {
      id: payment.tenant_id,
    },
  });

  if (!tenant) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    const membership = await tx.membership.findFirst({
      where: {
        tenant_id: payment.tenant_id,
        status: "PENDING",
      },
      orderBy: {
        created_at: "desc",
      },
      include: {
        user: true,
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

    // Generar factura y enviar email al tenant
    const invoiceData = await InvoiceService.generateInvoiceData(payment.id);
    const invoice = await InvoiceService.createInvoice(invoiceData);

    await sendInvoiceEmail(tenant.contact_email, invoice.id, true);

    // Enviar correo de bienvenida al administrador de la organización
    if (membership?.user) {
      await sendWelcomeEmail(
        tenant.contact_email,
        membership.user.fullname || tenant.name,
      );
    }
  });

  console.log("✅ Subscription activated for tenant:", payment.tenant_id);
};
