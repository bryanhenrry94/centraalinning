import { resend } from "@/infrastructure/mail/resend-client";
import { getEmailByEnv } from "@/shared/utils/mail";
import BlockCheckResultEmail from "@/modules/block-check/templates/BlockCheckResultEmail";
import { BlokCheckResponse } from "@/modules/block-check/services/block-check.types";

export const sendBlockCheckResultMail = async (
  to: string,
  fullname: string,
  result: BlokCheckResponse,
) => {
  try {
    const recipient = await getEmailByEnv(to);

    const { data, error } = await resend.emails.send({
      from: `${process.env.EMAIL_SENDER_NAME} <${process.env.EMAIL_FROM}>`,
      to: recipient,
      subject: "CFSB - Resultaat Blok-Check",
      react: (
        <BlockCheckResultEmail
          logoUrl={process.env.NEXT_PUBLIC_LOGO_URL || ""}
          fullname={fullname}
          personFullname={result.fullname}
          documentNumber={result.document_number}
          identificationType={result.identification_type}
          hasBlockade={result.has_blockade}
          reference={result.reference}
          checkedAt={result.checked_at}
        />
      ),
    });

    if (error) {
      console.error("Error sending Blok-Check result email:", error);
    }

    return data;
  } catch (error) {
    console.error("Error sending Blok-Check result email:", error);
  }
};
