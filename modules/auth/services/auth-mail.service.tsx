import { resend } from "@/infrastructure/mail/resend-client";
import { getEmailByEnv } from "@/shared/utils/mail";
import { WelcomeEmail } from "@/modules/auth/templates/WelcomeEmail";
import RecoveryPasswordEmail from "@/modules/auth/templates/RecoveryPasswordEmail";

export async function sendWelcomeEmail(to: string, fullname: string) {
  try {
    const recipient = await getEmailByEnv(to);

    const { data, error } = await resend.emails.send({
      from: `${process.env.EMAIL_SENDER_NAME} <${process.env.EMAIL_FROM}>`,
      to: recipient,
      subject: `Welkom bij ${process.env.NEXT_PUBLIC_APP_NAME || "Centraal Inning"}`,
      react: (
        <WelcomeEmail
          logoUrl={process.env.NEXT_PUBLIC_LOGO_URL || ""}
          fullname={fullname}
          appUrl={process.env.NEXT_PUBLIC_APP_URL || "https://www.centraalinning.com"}
        />
      ),
    });

    if (error) {
      return Response.json({ error }, { status: 500 });
    }

    return Response.json(data);
  } catch (error) {
    console.error("Error sending email:", error);
    return Response.json({ error }, { status: 500 });
  }
}

export const sendMailRecoveryPassword = async (
  to: string,
  username: string,
  resetLink: string,
) => {
  try {
    const recipient = await getEmailByEnv(to);

    const { data, error } = await resend.emails.send({
      from: `${process.env.EMAIL_SENDER_NAME} <${process.env.EMAIL_FROM}>`,
      to: recipient,
      subject: "Password Recovery",
      react: (
        <RecoveryPasswordEmail
          logoUrl={process.env.NEXT_PUBLIC_LOGO_URL || ""}
          fullname={username}
          link={resetLink}
        />
      ),
    });

    if (error) {
      return Response.json({ error }, { status: 500 });
    }

    return Response.json(data);
  } catch (error) {
    console.error("Error sending email:", error);
    return Response.json({ error }, { status: 500 });
  }
};
