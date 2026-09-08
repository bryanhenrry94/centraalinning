import { resend } from "@/infrastructure/mail/resend-client";
import { getEmailByEnv } from "@/shared/utils/mail";
import FinancialDeclarationInvitationEmail from "@/modules/block-check/templates/FinancialDeclarationInvitationEmail";

// Mismo patrón de buildTenantUrl que payment-transfer-mail.service.tsx — el
// dominio nunca se hardcodea, sale de NEXT_PUBLIC_ROOT_DOMAIN.
const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "cio.test:3000";
const PROTOCOL = process.env.NODE_ENV === "production" ? "https" : "http";

function buildTenantUrl(subdomain: string, path: string) {
  return `${PROTOCOL}://${subdomain}.${ROOT_DOMAIN}${path}`;
}

export const sendFinancialDeclarationInvitationMail = async (
  to: string,
  personFullname: string,
  tenantName: string,
  tenantSubdomain: string,
) => {
  try {
    const recipient = await getEmailByEnv(to);

    const { data, error } = await resend.emails.send({
      from: `${process.env.EMAIL_SENDER_NAME} <${process.env.EMAIL_FROM}>`,
      to: recipient,
      subject: "CFSB - Uitnodiging Financiële Verklaring",
      react: (
        <FinancialDeclarationInvitationEmail
          logoUrl={process.env.NEXT_PUBLIC_LOGO_URL || ""}
          personFullname={personFullname}
          tenantName={tenantName}
          financialReportUrl={buildTenantUrl(tenantSubdomain, "/financial-report")}
        />
      ),
    });

    if (error) {
      console.error("Error sending financial declaration invitation email:", error);
    }

    return data;
  } catch (error) {
    console.error("Error sending financial declaration invitation email:", error);
  }
};
