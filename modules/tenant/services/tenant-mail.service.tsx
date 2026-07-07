import { resend } from "@/infrastructure/mail/resend-client";
import { getEmailByEnv } from "@/shared/utils/mail";
import NewClientEmail, {
  NewClientEmailProps,
} from "@/modules/tenant/templates/NewClientEmail";

export const sendNewClitentEmail = async (
  to: string,
  clientName: string,
  registeredAt: string,
  totalClients: number,
) => {
  try {
    const recipient = await getEmailByEnv(to);

    const params: NewClientEmailProps = {
      logoUrl: process.env.NEXT_PUBLIC_LOGO_URL || "",
      clientName,
      registeredAt,
      totalClients,
    };

    const { data, error } = await resend.emails.send({
      from: `${process.env.EMAIL_SENDER_NAME} <${process.env.EMAIL_FROM}>`,
      to: recipient,
      subject: `Nieuwe geregistreerde klant - ${clientName}`,
      react: <NewClientEmail {...params} />,
    });

    if (error) {
      console.error("Error sending New Client email:", error);
      return Response.json({ error }, { status: 500 });
    }

    return Response.json(data);
  } catch (error) {
    console.error("Error sending email:", error);
    return Response.json({ error }, { status: 500 });
  }
};
