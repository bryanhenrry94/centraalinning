import { resend } from "@/infrastructure/mail/resend-client";
import { generatePdfBase64 } from "@/infrastructure/pdf/pdf";
import { getEmailByEnv } from "@/shared/utils/mail";
import EmployerMatchEmail from "@/modules/collective-follow-up/templates/EmployerMatchEmail";
import EmployerMatchPDF, {
  EmployerMatchPDFProps,
} from "@/modules/collective-follow-up/templates/pdfs/EmployerMatchPDF";

export interface EmployerMatchNoticeParams {
  fullname: string;
  letterDate: string;
  debtClaimReference: string;
  creditorName: string;
  employerName: string;
  gracePeriodDays: number;
  outstandingAmount: string;
  deadlineDate: string;
}

export const sendEmployerMatchNoticeEmail = async (
  to: string,
  params: EmployerMatchNoticeParams,
) => {
  const logoUrl = process.env.NEXT_PUBLIC_LOGO_URL || "";

  const pdfParams: EmployerMatchPDFProps = { logoUrl, ...params };
  const pdfBase64 = await generatePdfBase64(<EmployerMatchPDF {...pdfParams} />);
  const attachments = [
    { filename: "Collectieve-Opvolging-Werkgever.pdf", content: pdfBase64 },
  ];

  const recipient = await getEmailByEnv(to);

  const { error } = await resend.emails.send({
    from: `${process.env.EMAIL_SENDER_NAME} <${process.env.EMAIL_FROM}>`,
    to: recipient,
    subject: "CFSB - Werkgever geïdentificeerd",
    react: (
      <EmployerMatchEmail
        logoUrl={logoUrl}
        fullname={params.fullname}
        employerName={params.employerName}
      />
    ),
    attachments,
  });

  if (error) {
    throw new Error(error.message);
  }
};
