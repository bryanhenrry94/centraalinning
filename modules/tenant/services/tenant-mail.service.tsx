import { resend } from "@/infrastructure/mail/resend-client";
import { getEmailByEnv } from "@/shared/utils/mail";
import NewClientEmail, {
  NewClientEmailProps,
} from "@/modules/tenant/templates/NewClientEmail";

// Un solo correo (no uno por tenant) para avisar a los demás participantes
// activos que se registró un cliente nuevo — el destinatario principal es
// CFSB (OWNER_EMAIL_ADDRESS/EMAIL_FROM) y el resto de tenants van en CC.
export const sendNewClitentEmail = async (
  clientName: string,
  registeredAt: string,
  totalClients: number,
  ccEmails: string[],
): Promise<boolean> => {
  try {
    const to = await getEmailByEnv(
      process.env.OWNER_EMAIL_ADDRESS || process.env.EMAIL_FROM || "",
    );

    // En development nunca se hace CC a direcciones reales de tenants —
    // mismo criterio de seguridad que getEmailByEnv aplica al destinatario
    // principal (ver DEV_EMAIL_REDIRECT).
    const isDev = process.env.NODE_ENV === "development";
    const cc = isDev || ccEmails.length === 0 ? undefined : ccEmails;

    const params: NewClientEmailProps = {
      logoUrl: process.env.NEXT_PUBLIC_LOGO_URL || "",
      clientName,
      registeredAt,
      totalClients,
    };

    const { error } = await resend.emails.send({
      from: `${process.env.EMAIL_SENDER_NAME} <${process.env.EMAIL_FROM}>`,
      to,
      cc,
      subject: `Nieuwe geregistreerde klant - ${clientName}`,
      react: <NewClientEmail {...params} />,
    });

    if (error) {
      console.error("Error sending New Client email:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
};
