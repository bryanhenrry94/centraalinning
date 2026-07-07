import { prisma } from "@/lib/prisma";
import { resend } from "@/infrastructure/mail/resend-client";
import { generatePdfBase64 } from "@/infrastructure/pdf/pdf";
import { getEmailByEnv } from "@/shared/utils/mail";
import { formatDate } from "@/shared/utils/formatters";
import { ParameterService } from "@/modules/settings/services/parameter/parameter.service";
import VerdictApprovalEmail from "@/modules/verdict/templates/VerdictApprovalEmail";
import VerdictDebtorMail from "@/modules/verdict/templates/VerdictDebtorMail";
import VerdictCreditorMail from "@/modules/verdict/templates/VerdictCreditorMail";
import VerdictRegisterEmail from "@/modules/verdict/templates/VerdictRegisterMail";
import VerdictApprovalPDF, {
  VerdictApprovalPDFProps,
} from "@/modules/verdict/templates/pdfs/VerdictApprovalPDF";
import VerdictDebtorPDF, {
  VerdictDebtorPDFProps,
} from "@/modules/verdict/templates/pdfs/VerdictDebtorPDF";
import VerdictCreditorPDF, {
  VerdictCreditorPDFProps,
} from "@/modules/verdict/templates/pdfs/VerdictCreditorPDF";
import {
  InvoicePDF,
  InvoicePDFProps,
} from "@/modules/payment/templates/pdfs/InvoicePDF";

type VerdictRegisterEmailParams = {
  to: string;
  verdictReference: string;
  verdictDate: string;
};

export const sendVerdictApprovalEmail = async (
  to: string,
  fullname: string,
  verdictId: string,
) => {
  try {
    const recipient = await getEmailByEnv(to);

    const verdict = await prisma.verdict.findUnique({
      where: { id: verdictId },
      include: { tenant: true, bailiff: true },
    });

    if (!verdict) {
      throw new Error("Verdict not found");
    }

    const parameter = await ParameterService.getParameter();

    if (!parameter) {
      throw new Error("Parameters not found");
    }

    const params: VerdictApprovalPDFProps = {
      logoUrl: process.env.NEXT_PUBLIC_LOGO_URL || "",
      date: formatDate(new Date().toISOString()),
      bailiffName: verdict?.bailiff?.fullname || "Bailiff",
      creditor_name: verdict.creditor_name || "Creditor",
      reference: verdict.registration_number || "Reference",
      sentence_date: formatDate(
        verdict.sentence_date
          ? verdict.sentence_date.toISOString()
          : new Date().toISOString(),
      ),
      sentence_amount: verdict.sentence_amount
        ? verdict.sentence_amount.toFixed(2)
        : "0.00",
    };

    const pdfBase64 = await generatePdfBase64(
      <VerdictApprovalPDF {...params} />,
    );

    const attachments = [{ filename: `Blokkade.pdf`, content: pdfBase64 }];

    const { data, error } = await resend.emails.send({
      from: `${process.env.EMAIL_SENDER_NAME} <${process.env.EMAIL_FROM}>`,
      to: recipient,
      subject: `Approval Request for Verdict - ${verdict.registration_number}`,
      react: (
        <VerdictApprovalEmail
          logoUrl={process.env.NEXT_PUBLIC_LOGO_URL || ""}
          link={process.env.NEXT_PUBLIC_APP_URL || "https://www.centraalinning.com"}
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

export const sendMailVerdictDebtor = async (
  to: string,
  verdictData: VerdictDebtorPDFProps,
) => {
  try {
    const recipient = await getEmailByEnv(to);

    const pdfBase64 = await generatePdfBase64(
      <VerdictDebtorPDF {...verdictData} />,
    );

    const attachments = [
      {
        filename: `verdict_${verdictData.reference}.pdf`,
        content: pdfBase64,
      },
    ];

    const { data, error } = await resend.emails.send({
      from: `${process.env.EMAIL_SENDER_NAME} <${process.env.EMAIL_FROM}>`,
      to: recipient,
      subject: `Betekening Vonnis - ${verdictData.reference}`,
      react: (
        <VerdictDebtorMail
          logoUrl={process.env.NEXT_PUBLIC_LOGO_URL || ""}
          link={process.env.NEXT_PUBLIC_APP_URL || "https://www.centraalinning.com"}
          datumVonnis={verdictData.date}
          vonnisNummer={verdictData.reference}
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

export const sendMailVerdictCreditor = async (
  to: string,
  verdictData: VerdictCreditorPDFProps,
  invoiceData: InvoicePDFProps,
) => {
  try {
    const recipient = await getEmailByEnv(to);

    const pdfBase64 = await generatePdfBase64(
      <VerdictCreditorPDF {...verdictData} />,
    );
    const pdfInvoiceBase64 = await generatePdfBase64(
      <InvoicePDF {...invoiceData} />,
    );

    const attachments = [
      {
        filename: `verdict_${verdictData.reference_number}.pdf`,
        content: pdfBase64,
      },
      { filename: `Invoice.pdf`, content: pdfInvoiceBase64 },
    ];

    const { data, error } = await resend.emails.send({
      from: `${process.env.EMAIL_SENDER_NAME} <${process.env.EMAIL_FROM}>`,
      to: recipient,
      subject: `Factuur ${invoiceData.invoice_number}`,
      react: (
        <VerdictCreditorMail
          logoUrl={process.env.NEXT_PUBLIC_LOGO_URL || ""}
          link={process.env.NEXT_PUBLIC_APP_URL || "https://www.centraalinning.com"}
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

export const sendMailRegisterVerdict = async (
  params: VerdictRegisterEmailParams,
) => {
  try {
    const recipient = await getEmailByEnv(params.to);

    const { data, error } = await resend.emails.send({
      from: `${process.env.EMAIL_SENDER_NAME} <${process.env.EMAIL_FROM}>`,
      to: recipient,
      subject: "Bedankt voor uw registratie.",
      react: (
        <VerdictRegisterEmail
          logoUrl={process.env.NEXT_PUBLIC_LOGO_URL || ""}
          verdictReference={params.verdictReference}
          verdictDate={params.verdictDate}
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
