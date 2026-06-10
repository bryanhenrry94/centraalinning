import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
// Templates
import { WelcomeEmail } from "@/templates/emails/WelcomeEmail";
import InvoiceEmail from "@/templates/emails/InvoiceEmail";
import AanmanningEmail from "@/templates/emails/AanmanningEmail";
import SommatieMail from "@/templates/emails/SommatieEmail";
// PDFs
import { InvoicePDF, InvoicePDFProps } from "@/templates/pdfs/InvoicePDF";
import AanmaningPDF, { AanmaningPDFProps } from "@/components/pdf/AanmaningPDF";
import SommatiePDF, { SommatiePDFProps } from "@/components/pdf/SommatiePDF";
import BlokkadePDF, { BlokkadePDFProps } from "@/components/pdf/BlokkadePDF";
import IngebrekestellingPDF, {
  IngebrekestellingProps,
} from "@/components/pdf/IngebrekestellingPDF";
// Emails
import { BlokkadeEmail } from "@/templates/emails/BlokkadeEmail";
import { IngebrekestellingEmail } from "@/templates/emails/IngebrekestellingEmail";
// Server actions
import { getDataInvoicePDF } from "./billing-invoice";
import { getParameter } from "./parameter";
// Libs
import { generatePdfBase64 } from "@/lib/pdf";
// Utils
import { formatCurrency, formatDate } from "@/utils/formatters";
import { getNameCountry } from "@/utils/location";
import VerdictApprovalPDF, {
  VerdictApprovalPDFProps,
} from "@/templates/pdfs/VerdictApprovalPDF";
import VerdictApprovalEmail from "@/templates/emails/VerdictApprovalEmail";
import VerdictDebtorPDF, {
  VerdictDebtorPDFProps,
} from "@/templates/pdfs/VerdictDebtorPDF";
import VerdictDebtorMail from "@/templates/emails/VerdictDebtorMail";
import VerdictCreditorMail from "@/templates/emails/VerdictCreditorMail";
import VerdictCreditorPDF, {
  VerdictCreditorPDFProps,
} from "@/templates/pdfs/VerdictCreditorPDF";
import VerdictRegisterEmail from "@/templates/emails/VerdictRegisterMail";
import NewClientEmail, {
  NewClientEmailProps,
} from "@/templates/emails/NewClientEmail";
import RecoveryPasswordEmail from "@/templates/emails/RecoveryPasswordEmail";
import FinancialSummaryPDF, {
  FinancialSummaryPDFProps,
} from "@/components/pdf/FinancialSummaryPDF";
import FinancialSummaryEmail from "@/templates/emails/FinancialSummaryEmail";
import QRCode from "qrcode";
import ActivateContractEmail from "@/templates/emails/ActivateContractEmail";

const resend = new Resend(process.env.RESEND_API_KEY);

const getEmailByEnv = async (to: string) => {
  const isDev = process.env.NODE_ENV === "development";
  const devRedirect = process.env.DEV_EMAIL_REDIRECT;

  if (isDev && devRedirect) {
    console.log(`🔸 [DEV MODE] Redirecting email to: ${devRedirect}`);

    if (process.env.OWNER_EMAIL_ADDRESS) {
      console.log(
        `🔸 [DEV MODE] Also sending email to owner: ${process.env.OWNER_EMAIL_ADDRESS}`,
      );
      return [devRedirect, process.env.OWNER_EMAIL_ADDRESS];
    }

    return [devRedirect];
  }

  return [to];
};

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
          appUrl={
            process.env.NEXT_PUBLIC_APP_URL || "https://www.centraalinning.com"
          }
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

    console.log("params:", params);

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

export const sendInvoiceEmail = async (
  to: string,
  invoice_id: string,
  payment_url?: string,
  qr_code?: string,
): Promise<boolean> => {
  try {
    if (!to) {
      console.error("Recipient email is required");
      return false;
    }

    if (!invoice_id) {
      console.error("Invoice ID is required");
      return false;
    }

    const billing = await prisma.billingInvoice.findUnique({
      where: { id: invoice_id },
      include: { tenant: true },
    });

    if (!billing) {
      console.error("Invoice not found for ID:", invoice_id);
      return false;
    }

    // Generar el PDF de la factura
    const params = await getDataInvoicePDF(invoice_id);
    const pdfBase64 = await generatePdfBase64(<InvoicePDF {...params} />);

    const attachments = [
      {
        filename: `invoice.pdf`,
        content: pdfBase64,
      },
    ];

    const recipient = await getEmailByEnv(to);

    await resend.emails.send({
      from: `${process.env.EMAIL_SENDER_NAME} <${process.env.EMAIL_FROM}>`,
      to: recipient,
      subject: `FACTUUR - ${billing.invoice_number}`,
      react: (
        <InvoiceEmail
          logoUrl={process.env.NEXT_PUBLIC_LOGO_URL || ""}
          fullname={billing.tenant.name || "Customer"}
          paymentLink={payment_url}
        />
      ),
      attachments: attachments,
    });

    console.log("Invoice enviada al correo: ", to);
    return true;
  } catch (error) {
    console.error("Error sending mail notification:", error);
    return false;
  }
};

export const sendAanmaningEmail = async (
  to: string,
  caseId: string,
  invitationLink?: string,
) => {
  try {
    // Generar el PDF de la aanmaning
    const collection = await prisma.collectionCase.findUnique({
      where: { id: caseId },
      include: {
        tenant: true,
        debtor: {
          include: { person: true },
        },
      },
    });

    if (!collection) {
      throw new Error("Collection case not found");
    }

    const parameter = await getParameter();

    if (!parameter) {
      throw new Error("Parameters not found");
    }

    const island = getNameCountry(collection.tenant.country_code);

    const debtorName =
      `${collection.debtor.person?.first_name} ${collection.debtor.person?.last_name}`.trim() ||
      collection.debtor.person?.business_name;

    const debtorAddress = collection.debtor.person?.address || "";

    const params: AanmaningPDFProps = {
      logoUrl: process.env.NEXT_PUBLIC_LOGO_URL || "",
      date: formatDate(collection.issue_date.toString()),
      debtorName: debtorName || "Debtor",
      debtorAddress: debtorAddress,
      island: island || "Bonaire",
      reference_number: collection.reference_number || "",
      digitalFileCosts: parameter.digital_file_costs
        ? parameter.digital_file_costs.toFixed(2)
        : "0.00",
      total_amount: collection.total_due.toFixed(2),
      bankName: parameter.bank_name || "Bank Name",
      accountNumber: parameter.bank_account || "Account Number",
      amount_original: collection.amount_original.toFixed(2),
      extraCosts: collection.fee_amount.toFixed(2),
      calculatedABB: collection.abb_amount.toFixed(2),
      tenantName: collection.tenant.name || "Tenant",
    };

    const pdfBase64 = await generatePdfBase64(<AanmaningPDF {...params} />);

    const attachments = [
      {
        filename: `Aanmaning.pdf`,
        content: pdfBase64,
      },
    ];

    const recipient = await getEmailByEnv(to);

    const { data, error } = await resend.emails.send({
      from: `${process.env.EMAIL_SENDER_NAME} <${process.env.EMAIL_FROM}>`,
      to: recipient,
      subject: "Aanmaning",
      react: (
        <AanmanningEmail
          logoUrl={process.env.NEXT_PUBLIC_LOGO_URL || ""}
          fullname={debtorName || "Debtor"}
          invitationLink={
            invitationLink ? invitationLink : "https://centraalinning.com/"
          }
        />
      ),
      attachments: attachments,
    });

    if (error) {
      return Response.json({ error }, { status: 500 });
    }

    console.log(
      "Send_Aanmaning: Aanmaning email sent successfully to XXX:",
      to,
    );

    return Response.json(data);
  } catch (error) {
    console.error("Error sending email:", error);
    return Response.json({ error }, { status: 500 });
  }
};

export const sendSommatieEmail = async (to: string, caseId: string) => {
  try {
    const collection = await prisma.collectionCase.findUnique({
      where: { id: caseId },
      include: {
        tenant: true,
        debtor: { include: { person: true } },
      },
    });

    if (!collection) {
      throw new Error("Collection case not found");
    }

    const island = getNameCountry(collection.tenant.country_code);

    const debtorName =
      `${collection.debtor.person?.first_name} ${collection.debtor.person?.last_name}`.trim() ||
      collection.debtor.person?.business_name;

    const debtorAddress = collection.debtor.person?.address || "";

    const params: SommatiePDFProps = {
      logoUrl: process.env.NEXT_PUBLIC_LOGO_URL || "",
      date: formatDate(collection.issue_date.toString()),
      debtorName: debtorName || "Debtor",
      debtorAddress: debtorAddress,
      island: island || "Bonaire",
      reference_number: collection.reference_number || "",
      total_amount: collection.total_due.toFixed(2),
      amount_original: collection.amount_original.toFixed(2),
      calculatedABB: collection.abb_amount.toFixed(2),
      tenantName: collection.tenant.name || "Tenant",
      administrativeCosts: Number(0).toFixed(2),
      additionalCosts: Number(0).toFixed(2),
      additionalABB: Number(0).toFixed(2),
    };

    const pdfBase64 = await generatePdfBase64(<SommatiePDF {...params} />);

    const attachments = [
      {
        filename: `Sommatie.pdf`,
        content: pdfBase64,
      },
    ];

    const recipient = await getEmailByEnv(to);

    const { data, error } = await resend.emails.send({
      from: `${process.env.EMAIL_SENDER_NAME} <${process.env.EMAIL_FROM}>`,
      to: recipient,
      subject: "Sommatie",
      react: (
        <SommatieMail
          logoUrl={process.env.NEXT_PUBLIC_LOGO_URL || ""}
          fullname={debtorName || "Debtor"}
        />
      ),
      attachments: attachments,
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

export const sendIngebrekestellingMail = async (to: string, caseId: string) => {
  try {
    const collection = await prisma.collectionCase.findUnique({
      where: { id: caseId },
      include: {
        tenant: true,
        debtor: { include: { person: true } },
      },
    });

    if (!collection) {
      throw new Error("Collection case not found");
    }

    const parameter = await getParameter();

    if (!parameter) {
      throw new Error("Parameters not found");
    }

    const island = getNameCountry(collection.tenant.country_code);

    const debtorName =
      `${collection.debtor.person?.first_name} ${collection.debtor.person?.last_name}`.trim() ||
      collection.debtor.person?.business_name;

    const debtorAddress = collection.debtor.person?.address || "";

    const firstReminderDate = await prisma.collectionCaseNotification.findFirst(
      {
        where: {
          collection_case_id: collection.id,
          type: "AANMANING",
        },
      },
    );

    // console.log("firstReminderDate", firstReminderDate);
    if (!firstReminderDate) {
      throw new Error("First reminder date not found");
    }

    const secondReminderDate =
      await prisma.collectionCaseNotification.findFirst({
        where: {
          collection_case_id: collection.id,
          type: "SOMMATIE",
        },
      });

    // console.log("secondReminderDate", secondReminderDate);
    if (!secondReminderDate) {
      throw new Error("Second reminder date not found");
    }

    const params: IngebrekestellingProps = {
      logoUrl: process.env.NEXT_PUBLIC_LOGO_URL || "",
      date: formatDate(collection.issue_date.toString()),
      debtorName: debtorName || "Debtor",
      debtorAddress: debtorAddress || "",
      island: island || "Bonaire",
      referenceNumber: collection.reference_number || "",
      tenantName: collection.tenant.name || "Tenant",
    };

    const pdfBase64 = await generatePdfBase64(
      <IngebrekestellingPDF {...params} />,
    );

    const attachments = [
      {
        filename: `Ingebrekestelling.pdf`,
        content: pdfBase64,
      },
    ];

    const recipient = await getEmailByEnv(to);

    const { data, error } = await resend.emails.send({
      from: `${process.env.EMAIL_SENDER_NAME} <${process.env.EMAIL_FROM}>`,
      to: recipient,
      subject: "Ingebrekestelling",
      react: (
        <IngebrekestellingEmail
          logoUrl={process.env.NEXT_PUBLIC_LOGO_URL || ""}
          fullname={debtorName || "Debtor"}
        />
      ),
      attachments: attachments,
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

export const sendFinancialReportMail = async (financial_report_id: string) => {
  try {
    const financial_report = await prisma.financialReportRequest.findUnique({
      where: { id: financial_report_id },
      include: {
        tenant: true,
        person: true,
      },
    });

    if (!financial_report) {
      throw new Error("Financial report not found");
    }

    const parameter = await getParameter();

    if (!parameter) {
      throw new Error("Parameters not found");
    }

    const qrCode = await QRCode.toDataURL(
      "https://sbxcentraalinning.com/verify/" + financial_report.id,
    );

    if (!financial_report.person_id) {
      throw new Error("Person ID not found in financial report");
    }

    // obtener el deudor por el person_id del financial_report
    const debtor = await prisma.debtor.findFirst({
      where: { person_id: financial_report.person_id },
    });

    if (!debtor) {
      throw new Error(
        "Debtor not found for person_id: " + financial_report.person_id,
      );
    }

    // obtener todas las deudas del deudor en estado open y contarlas
    const openDebtsCount = await prisma.debt.count({
      where: { debtor_id: debtor.id, status: "OPEN" },
    });

    // obtener el saldo total de las deudas del deudor en estado open
    const balanceTotalResult = await prisma.$queryRaw<{ balance: number }[]>`
      SELECT COALESCE(SUM(balance), 0) as balance
      FROM vw_debtor_summary
      WHERE debtor_id = ${debtor.id}
        AND status = 'OPEN'
    `;

    const balanceTotal = balanceTotalResult?.[0]?.balance || 0;

    // Obtener los acuerdos de pago activos y vencidos del deudor
    const activePaymentPlansCount = await prisma.agreement.count({
      where: {
        debtor_id: debtor.id,
        status: "ACCEPTED",
      },
    });

    // obtener el numero de acuerdos de pagos que no se cumplen según los términos pactados.
    const overduePaymentPlansCount = await prisma.agreement.count({
      where: {
        debtor_id: debtor.id,
        status: "CANCELLED",
      },
    });

    let summary = "";

    // Situación 1 — Sin bloqueo + acuerdos correctos
    if (
      financial_report?.person?.has_blockade === false &&
      overduePaymentPlansCount <= 0
    ) {
      summary = "Actieve betalingsregelingen worden correct nagekomen.";
    }

    // Situación 2 — Bloqueo activo + sin acuerdo de pago
    if (
      financial_report?.person?.has_blockade === true &&
      overduePaymentPlansCount <= 0
    ) {
      summary = "Er is een actieve economische blokkade geregistreerd.";
    }

    // Situación 3 — Bloqueo activo + acuerdo de pago activo
    if (
      financial_report?.person?.has_blockade === true &&
      activePaymentPlansCount > 0
    ) {
      summary =
        "Er is een actieve economische blokkade geregistreerd. Een betalingsregeling is actief.";
    }

    const params: FinancialSummaryPDFProps = {
      logoUrl: process.env.NEXT_PUBLIC_LOGO_URL || "",
      issueDate: formatDate(financial_report.created_at.toISOString()),
      validUntil: formatDate(
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      ), // Válido por 30 días
      referenceNumber: financial_report.id,

      // PERSONAL INFO
      idNumber: financial_report.person?.identification || "",
      fullName:
        `${financial_report.person?.first_name} ${financial_report.person?.last_name}`.trim() ||
        financial_report.person?.business_name ||
        "N/A",
      address: financial_report.person?.address || "",

      // FINANCIAL SUMMARY
      openObligations: openDebtsCount ? openDebtsCount.toString() : "0",
      totalOutstandingAmount: formatCurrency(balanceTotal),
      activePaymentPlans: activePaymentPlansCount
        ? activePaymentPlansCount.toString()
        : "0",
      overduePaymentPlans: overduePaymentPlansCount
        ? overduePaymentPlansCount.toString()
        : "0",
      // BLOCK STATUS
      economicBlockRegistered: financial_report?.person?.has_blockade
        ? "Met Blokkade"
        : "Geen Blokkade",

      // SUMMARY
      summary: summary,
      // QR
      qrCode: qrCode,
    };

    const pdfBase64 = await generatePdfBase64(
      <FinancialSummaryPDF {...params} />,
    );

    const attachments = [
      {
        filename: `FinancialSummary.pdf`,
        content: pdfBase64,
      },
    ];

    const to = financial_report.person?.email;

    if (!to) {
      throw new Error("Recipient email not found");
    }

    const recipient = await getEmailByEnv(to);

    const { data, error } = await resend.emails.send({
      from: `${process.env.EMAIL_SENDER_NAME} <${process.env.EMAIL_FROM}>`,
      to: recipient,
      subject: "Financial Summary",
      react: (
        <FinancialSummaryEmail
          logoUrl={process.env.NEXT_PUBLIC_LOGO_URL || ""}
          fullname={params.fullName}
        />
      ),
      attachments: attachments,
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

export const sendBlokkadeMail = async (to: string, caseId: string) => {
  try {
    const collection = await prisma.collectionCase.findUnique({
      where: { id: caseId },
      include: { tenant: true, debtor: { include: { person: true } } },
    });

    if (!collection) {
      throw new Error("Collection case not found");
    }

    const parameter = await getParameter();

    if (!parameter) {
      throw new Error("Parameters not found");
    }

    const island = getNameCountry(collection.tenant.country_code);

    const debtorName =
      `${collection.debtor.person?.first_name} ${collection.debtor.person?.last_name}`.trim() ||
      collection.debtor.person?.business_name;

    const debtorAddress = collection.debtor.person?.address || "";

    const params: BlokkadePDFProps = {
      logoUrl: process.env.NEXT_PUBLIC_LOGO_URL || "",
      date: formatDate(collection.issue_date.toString()),
      debtorName: debtorName || "Debtor",
      debtorAddress: debtorAddress || "",
      island: island || "Bonaire",
      referenceNumber: collection.reference_number || "",
      tenantName: collection.tenant.name || "Tenant",
    };

    const pdfBase64 = await generatePdfBase64(<BlokkadePDF {...params} />);

    const attachments = [
      {
        filename: `Blokkade.pdf`,
        content: pdfBase64,
      },
    ];

    const recipient = await getEmailByEnv(to);

    const { data, error } = await resend.emails.send({
      from: `${process.env.EMAIL_SENDER_NAME} <${process.env.EMAIL_FROM}>`,
      to: recipient,
      subject: "Blokkade",
      react: (
        <BlokkadeEmail
          logoUrl={process.env.NEXT_PUBLIC_LOGO_URL || ""}
          fullname={debtorName || "Debtor"}
        />
      ),
      attachments: attachments,
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
      subject: `Overeenkomst ${reference_number} geactiveerd`,
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

    const parameter = await getParameter();

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

    const attachments = [
      {
        filename: `Blokkade.pdf`,
        content: pdfBase64,
      },
    ];

    const { data, error } = await resend.emails.send({
      from: `${process.env.EMAIL_SENDER_NAME} <${process.env.EMAIL_FROM}>`,
      to: recipient,
      subject: `Approval Request for Verdict - ${verdict.registration_number}`,
      react: (
        <VerdictApprovalEmail
          logoUrl={process.env.NEXT_PUBLIC_LOGO_URL || ""}
          link={
            process.env.NEXT_PUBLIC_APP_URL || "https://www.centraalinning.com"
          }
        />
      ),
      attachments: attachments,
    });

    console.log("Verdict approval email sent to:", to);
    console.log("Email data:", data);

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
          link={
            process.env.NEXT_PUBLIC_APP_URL || "https://www.centraalinning.com"
          }
          datumVonnis={verdictData.date}
          vonnisNummer={verdictData.reference}
        />
      ),
      attachments: attachments,
    });

    if (error) {
      return Response.json({ error }, { status: 500 });
    }

    console.log("Verdict creditor email sent to:", to);
    console.log("Email data:", data);

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
      {
        filename: `Invoice.pdf`,
        content: pdfInvoiceBase64,
      },
    ];

    const { data, error } = await resend.emails.send({
      from: `${process.env.EMAIL_SENDER_NAME} <${process.env.EMAIL_FROM}>`,
      to: recipient,
      subject: `Factuur ${invoiceData.invoice_number}`,
      react: (
        <VerdictCreditorMail
          logoUrl={process.env.NEXT_PUBLIC_LOGO_URL || ""}
          link={
            process.env.NEXT_PUBLIC_APP_URL || "https://www.centraalinning.com"
          }
        />
      ),
      attachments: attachments,
    });

    if (error) {
      return Response.json({ error }, { status: 500 });
    }

    console.log("Verdict creditor email sent to:", to);
    console.log("Email data:", data);

    return Response.json(data);
  } catch (error) {
    console.error("Error sending email:", error);
    return Response.json({ error }, { status: 500 });
  }
};

type VerdictRegisterEmailParams = {
  to: string;
  verdictReference: string;
  verdictDate: string;
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

    console.log("Verdict register email sent to:", params.to);
    console.log("Email data:", data);

    return Response.json(data);
  } catch (error) {
    console.error("Error sending email:", error);
    return Response.json({ error }, { status: 500 });
  }
};

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

    console.log("Password recovery email sent to:", to);
    console.log("Email data:", data);

    return Response.json(data);
  } catch (error) {
    console.error("Error sending email:", error);
    return Response.json({ error }, { status: 500 });
  }
};
