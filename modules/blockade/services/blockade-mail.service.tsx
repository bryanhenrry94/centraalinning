import { prisma } from "@/lib/prisma";
import { resend } from "@/infrastructure/mail/resend-client";
import { generatePdfBuffer } from "@/infrastructure/pdf/pdf";
import { getEmailByEnv } from "@/shared/utils/mail";
import { formatDate } from "@/shared/utils/formatters";
import { getNameCountry } from "@/shared/utils/location";
import BlokkadePDF, {
  BlokkadePDFProps,
} from "@/modules/blockade/templates/pdfs/BlokkadePDF";
import { BlokkadeEmail } from "@/modules/blockade/templates/BlokkadeEmail";
import EconomischeBlokkadeEmail from "@/modules/blockade/templates/EconomischeBlokkadeEmail";

// Herbruikt door zowel het verzenden van de blokkade-mail als het on-demand
// downloaden van de brief (zie app/api/legal-processes/transfers/[id]/
// letters/[type]/route.ts, voor de advocaat-Documenten-sectie).
export const buildBlokkadePdfProps = async (
  caseId: string,
): Promise<BlokkadePDFProps> => {
  const claim = await prisma.debtClaim.findUnique({
    where: { id: caseId },
    include: { tenant: true, debtor: { include: { person: true } } },
  });

  if (!claim) {
    throw new Error("Debt claim not found");
  }

  const island = getNameCountry(claim.tenant.country_code);

  const debtorName =
    `${claim.debtor.person?.first_name} ${claim.debtor.person?.last_name}`.trim() ||
    claim.debtor.person?.business_name;

  const debtorAddress = claim.debtor.person?.address || "";

  return {
    logoUrl: process.env.NEXT_PUBLIC_LOGO_URL || "",
    date: formatDate(claim.createdAt.toString()),
    debtorName: debtorName || "Debtor",
    debtorAddress: debtorAddress || "",
    island: island || "Bonaire",
    referenceNumber: claim.reference || "",
    tenantName: claim.tenant.name || "Organisatie",
  };
};

export const generateBlokkadePdfBuffer = async (caseId: string) => {
  const params = await buildBlokkadePdfProps(caseId);
  return generatePdfBuffer(<BlokkadePDF {...params} />);
};

export const sendBlokkadeMail = async (to: string, caseId: string) => {
  try {
    const claim = await prisma.debtClaim.findUnique({
      where: { id: caseId },
      include: { tenant: true, debtor: { include: { person: true } } },
    });

    if (!claim) {
      throw new Error("Debt claim not found");
    }

    const debtorName =
      `${claim.debtor.person?.first_name} ${claim.debtor.person?.last_name}`.trim() ||
      claim.debtor.person?.business_name;

    const pdfBuffer = await generateBlokkadePdfBuffer(caseId);
    const pdfBase64 = pdfBuffer.toString("base64");

    const attachments = [{ filename: `Blokkade.pdf`, content: pdfBase64 }];

    const recipient = await getEmailByEnv(to);

    const { data, error } = await resend.emails.send({
      from: `${process.env.EMAIL_SENDER_NAME} <${process.env.EMAIL_FROM}>`,
      to: recipient,
      subject: "Blokkade",
      react: (
        <BlokkadeEmail
          logoUrl={process.env.NEXT_PUBLIC_LOGO_URL || ""}
          fullname={debtorName || "Debtor"}
          tenantName={claim.tenant.name || "Organisatie"}
        />
      ),
      attachments,
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

export const sendMailBlockade = async (
  to: string,
  debtorName: string,
  creditorName: string,
) => {
  try {
    const recipient = await getEmailByEnv(to);

    const { data, error } = await resend.emails.send({
      from: `${process.env.EMAIL_SENDER_NAME} <${process.env.EMAIL_FROM}>`,
      to: recipient,
      subject: "CFSB - Blokkade",
      react: (
        <EconomischeBlokkadeEmail
          logoUrl={process.env.NEXT_PUBLIC_LOGO_URL || ""}
          fullname={debtorName}
          creditorName={creditorName}
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
