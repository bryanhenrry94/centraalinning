import { prisma } from "@/lib/prisma";
import { resend } from "@/infrastructure/mail/resend-client";
import { generatePdfBase64 } from "@/infrastructure/pdf/pdf";
import { getEmailByEnv } from "@/shared/utils/mail";
import { formatCurrency, formatDate } from "@/shared/utils/formatters";
import { ParameterService } from "@/modules/settings/services/parameter/parameter.service";
import InvoiceEmail from "@/modules/payment/templates/InvoiceEmail";
import FinancialSummaryEmail from "@/modules/payment/templates/FinancialSummaryEmail";
import {
  InvoicePDF,
  InvoicePDFProps,
} from "@/modules/payment/templates/pdfs/InvoicePDF";
import FinancialSummaryPDF, {
  FinancialSummaryPDFProps,
} from "@/modules/payment/templates/pdfs/FinancialSummaryPDF";
import { getDataInvoicePDF } from "@/modules/payment/actions/billing-invoice.actions";
import { DebtorService } from "@/modules/collection/services/debtor.service";
import { getSourceStatusInfo } from "@/modules/collection/utils/debt-claim-status";
import QRCode from "qrcode";

export const sendInvoiceEmail = async (
  to: string,
  invoice_id: string,
  isPaid: boolean = false,
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

    const params = await getDataInvoicePDF(invoice_id);
    params.isPaid = isPaid;

    const pdfBase64 = await generatePdfBase64(<InvoicePDF {...params} />);

    const attachments = [{ filename: `invoice.pdf`, content: pdfBase64 }];

    const recipient = await getEmailByEnv(to);

    await resend.emails.send({
      from: `${process.env.EMAIL_SENDER_NAME} <${process.env.EMAIL_FROM}>`,
      to: recipient,
      subject: `FACTUUR - ${billing.invoice_number}`,
      react: (
        <InvoiceEmail
          logoUrl={process.env.NEXT_PUBLIC_LOGO_URL || ""}
          fullname={billing.tenant.name || "Customer"}
        />
      ),
      attachments,
    });

    return true;
  } catch (error) {
    console.error("Error sending mail notification:", error);
    return false;
  }
};

export const sendFinancialReportMail = async (financial_report_id: string) => {
  try {
    const financial_report = await prisma.financialReportRequest.findUnique({
      where: { id: financial_report_id },
      include: { tenant: true, person: true },
    });

    if (!financial_report) {
      throw new Error("Financial report not found");
    }

    const parameter = await ParameterService.getParameter();

    if (!parameter) {
      throw new Error("Parameters not found");
    }

    const qrCode = await QRCode.toDataURL(
      "https://sbxcentraalinning.com/verify/" + financial_report.id,
    );

    if (!financial_report.person_id) {
      throw new Error("Person ID not found in financial report");
    }

    const debtor = await prisma.debtor.findFirst({
      where: {
        person_id: financial_report.person_id,
        tenant_id: financial_report.tenant_id,
      },
    });

    if (!debtor) {
      throw new Error(
        "Debtor not found for person_id: " + financial_report.person_id,
      );
    }

    const debtsResponse = await DebtorService.getDebts({
      debtor_id: debtor.id,
      tenant_id: financial_report.tenant_id,
    });

    const openDebts = (debtsResponse.data || []).filter(
      (debt) => debt.balance > 0,
    );

    // El resumen agregado se deriva de la misma lista que alimenta la tabla
    // de detalle, para que ambos coincidan (openDebts ya usa balance > 0,
    // igual que el botón "Betalen" del dashboard del deudor — no se filtra
    // por DebtClaim.status, ya que una deuda en AANMANING/SOMMATIE sigue
    // pendiente aunque su status ya no sea "OPEN").
    const openDebtsCount = openDebts.length;
    const balanceTotal = openDebts.reduce(
      (total, debt) => total + debt.balance + (debt.total_fined || 0),
      0,
    );

    const activePaymentPlansCount = await prisma.agreement.count({
      where: { debtor_id: debtor.id, status: "ACCEPTED" },
    });

    const overduePaymentPlansCount = await prisma.agreement.count({
      where: { debtor_id: debtor.id, status: "CANCELLED" },
    });

    let summary = "";

    if (
      financial_report?.person?.has_blockade === false &&
      overduePaymentPlansCount <= 0
    ) {
      summary = "Actieve betalingsregelingen worden correct nagekomen.";
    }

    if (
      financial_report?.person?.has_blockade === true &&
      overduePaymentPlansCount <= 0
    ) {
      summary = "Er is een actieve economische blokkade geregistreerd.";
    }

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
      ),
      referenceNumber: financial_report.id,
      idNumber: financial_report.person?.identification || "",
      fullName:
        `${financial_report.person?.first_name} ${financial_report.person?.last_name}`.trim() ||
        financial_report.person?.business_name ||
        "N/A",
      address: financial_report.person?.address || "",
      openObligations: openDebtsCount ? openDebtsCount.toString() : "0",
      totalOutstandingAmount: formatCurrency(balanceTotal),
      activePaymentPlans: activePaymentPlansCount
        ? activePaymentPlansCount.toString()
        : "0",
      overduePaymentPlans: overduePaymentPlansCount
        ? overduePaymentPlansCount.toString()
        : "0",
      economicBlockRegistered: financial_report?.person?.has_blockade
        ? "Met Blokkade"
        : "Geen Blokkade",
      summary,
      debts: openDebts.map((debt) => ({
        reference: debt.reference || debt.id,
        dueDate: debt.due_date ? formatDate(debt.due_date.toString()) : "-",
        status: getSourceStatusInfo(debt.source_status).label,
        balance: formatCurrency(debt.balance + (debt.total_fined || 0)),
      })),
      qrCode,
    };

    const pdfBase64 = await generatePdfBase64(
      <FinancialSummaryPDF {...params} />,
    );

    const attachments = [
      { filename: `FinancialSummary.pdf`, content: pdfBase64 },
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

export type { InvoicePDFProps };
