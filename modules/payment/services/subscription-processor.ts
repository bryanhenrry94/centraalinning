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

  // El envío de correos hace una llamada de red a Resend; si corre dentro
  // de la $transaction puede superar el timeout por defecto de Prisma
  // (5s) y hacer fallar/rollback toda la activación (membership,
  // subscription, lawyer, bailiff) aunque el pago ya haya quedado "paid"
  // — el webhook de Sentoo no reintenta porque igual responde 200. Por
  // eso los envíos de correo van después de que la transacción cierra.
  const { membershipUser, invoiceId } = await prisma.$transaction(async (tx) => {
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

    // Si esta suscripción es de un abogado o alguacil autorregistrado
    // (planes Advocaat/Deurwaarder), activarlo también — recién ahí queda
    // disponible en el directorio platform-wide para transferencias de GOP.
    await tx.lawyer.updateMany({
      where: { tenantId: payment.tenant_id, status: "INACTIVE" },
      data: { status: "ACTIVE" },
    });
    await tx.bailiff.updateMany({
      where: { tenant_id: payment.tenant_id, status: "INACTIVE" },
      data: { status: "ACTIVE" },
    });

    // Generar factura (solo escritura en BD, sin I/O externo)
    const invoiceData = await InvoiceService.generateInvoiceData(payment.id);
    const invoice = await InvoiceService.createInvoice(invoiceData);

    return { membershipUser: membership?.user ?? null, invoiceId: invoice.id };
  });

  // Envíos de correo fuera de la transacción: si fallan, la activación ya
  // quedó comprometida en la base de datos.
  await sendInvoiceEmail(tenant.contact_email, invoiceId, true);

  if (membershipUser) {
    await sendWelcomeEmail(
      tenant.contact_email,
      membershipUser.fullname || tenant.name,
    );
  }

  console.log("✅ Subscription activated for tenant:", payment.tenant_id);
};
