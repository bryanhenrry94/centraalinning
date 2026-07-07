import { resend } from "@/infrastructure/mail/resend-client";
import { getEmailByEnv } from "@/shared/utils/mail";
import ActivateContractEmail from "@/modules/contract/templates/ActivateContractEmail";

export const sendActivateContractMail = async (
  to: string,
  fullname: string,
  reference_number: string,
) => {
  try {
    const recipient = await getEmailByEnv(to);

    const { data, error } = await resend.emails.send({
      from: `${process.env.EMAIL_SENDER_NAME} <${process.env.EMAIL_FROM}>`,
      to: recipient,
      subject: `Financiële afspraakregistratie: ${reference_number}`,
      react: (
        <ActivateContractEmail
          logoUrl={process.env.NEXT_PUBLIC_LOGO_URL || ""}
          fullname={fullname}
          contractNumber={reference_number}
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
