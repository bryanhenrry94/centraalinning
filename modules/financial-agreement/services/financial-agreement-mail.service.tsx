import { resend } from "@/infrastructure/mail/resend-client";
import { getEmailByEnv } from "@/shared/utils/mail";
import FarRegisteredEmail from "@/modules/financial-agreement/templates/FarRegisteredEmail";

export type FarRegisteredMailDetails = {
  farNumber: string;
  registeredAt: string;
  tenantName: string;
  clientName: string;
  clientKvk: string;
  clientAddress: string;
  clientPhone: string;
  clientEmail: string;
  debtorTypeLabel: string;
  debtorName: string;
  debtorIdentification: string;
  debtorAddress: string;
  debtorPhone: string;
  debtorEmail: string;
  agreementDescription: string;
  agreementReference: string;
  agreementInvoiceDate: string;
  agreementDueDate: string;
  agreementAmount: string;
  documentsCount: number;
};

// Correo de confirmación con el detalle completo de la afspraak (opdrachtgever
// + wederpartij + condiciones + kosten) — se envía tanto al deudor como al
// tenant que registró el FAR, con el mismo contenido, para que ambas partes
// del contrato tengan claros los términos.
export const sendFarRegisteredMail = async (
  params: FarRegisteredMailDetails & { to: string },
) => {
  const { to, ...details } = params;

  try {
    const recipient = await getEmailByEnv(to);

    const { error } = await resend.emails.send({
      from: `${process.env.EMAIL_SENDER_NAME} <${process.env.EMAIL_FROM}>`,
      to: recipient,
      subject: `FAR-registratie bevestigd (${details.farNumber})`,
      react: (
        <FarRegisteredEmail
          logoUrl={process.env.NEXT_PUBLIC_LOGO_URL || ""}
          {...details}
        />
      ),
    });

    if (error) {
      console.error(
        "Error sending FAR registration confirmation email:",
        error,
      );
    }
  } catch (error) {
    console.error("Error sending FAR registration confirmation email:", error);
  }
};
