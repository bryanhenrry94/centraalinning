import { prisma } from "@/lib/prisma";
import { resend } from "@/infrastructure/mail/resend-client";
import { generatePdfBase64 } from "@/infrastructure/pdf/pdf";
import { getEmailByEnv } from "@/shared/utils/mail";
import { formatDate } from "@/shared/utils/formatters";
import { getNameCountry } from "@/shared/utils/location";
import { ParameterService } from "@/modules/settings/services/parameter/parameter.service";
import AanmanningEmail from "@/modules/collection/templates/AanmanningEmail";
import SommatieMail from "@/modules/collection/templates/SommatieEmail";
import { IngebrekestellingEmail } from "@/modules/collection/templates/IngebrekestellingEmail";
import AanmaningPDF, {
  AanmaningPDFProps,
} from "@/modules/collection/templates/pdfs/AanmaningPDF";
import SommatiePDF, {
  SommatiePDFProps,
} from "@/modules/collection/templates/pdfs/SommatiePDF";
import IngebrekestellingPDF, {
  IngebrekestellingProps,
} from "@/modules/collection/templates/pdfs/IngebrekestellingPDF";

export const sendAanmaningEmail = async (
  to: string,
  caseId: string,
  invitationLink?: string,
) => {
  try {
    const claim = await prisma.debtClaim.findUnique({
      where: { id: caseId },
      include: {
        tenant: true,
        debtor: { include: { person: true } },
        charges: true,
      },
    });

    if (!claim) {
      throw new Error("Debt claim not found");
    }

    const parameter = await ParameterService.getParameter();

    if (!parameter) {
      throw new Error("Parameters not found");
    }

    const island = getNameCountry(claim.tenant.country_code);

    const debtorName =
      `${claim.debtor.person?.first_name} ${claim.debtor.person?.last_name}`.trim() ||
      claim.debtor.person?.business_name;

    const debtorAddress = claim.debtor.person?.address || "";

    const feeCharge = claim.charges.find(
      (c) => c.concept === "Honorarios de cobranza",
    );
    const abbCharge = claim.charges.find((c) => c.concept === "ABB (belasting)");

    const params: AanmaningPDFProps = {
      logoUrl: process.env.NEXT_PUBLIC_LOGO_URL || "",
      date: formatDate(claim.createdAt.toString()),
      debtorName: debtorName || "Debtor",
      debtorAddress: debtorAddress,
      island: island || "Bonaire",
      reference_number: claim.reference || "",
      digitalFileCosts: parameter.digital_file_costs
        ? parameter.digital_file_costs.toFixed(2)
        : "0.00",
      total_amount: Number(claim.currentAmount).toFixed(2),
      bankName: parameter.bank_name || "Bank Name",
      accountNumber: parameter.bank_account || "Account Number",
      amount_original: Number(claim.principalAmount).toFixed(2),
      extraCosts: feeCharge ? Number(feeCharge.amount).toFixed(2) : "0.00",
      calculatedABB: abbCharge ? Number(abbCharge.amount).toFixed(2) : "0.00",
      tenantName: claim.tenant.name || "Tenant",
    };

    const pdfBase64 = await generatePdfBase64(<AanmaningPDF {...params} />);

    const attachments = [{ filename: `Aanmaning.pdf`, content: pdfBase64 }];

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

export const sendSommatieEmail = async (to: string, caseId: string) => {
  try {
    const claim = await prisma.debtClaim.findUnique({
      where: { id: caseId },
      include: {
        tenant: true,
        debtor: { include: { person: true } },
        charges: true,
      },
    });

    if (!claim) {
      throw new Error("Debt claim not found");
    }

    const island = getNameCountry(claim.tenant.country_code);

    const debtorName =
      `${claim.debtor.person?.first_name} ${claim.debtor.person?.last_name}`.trim() ||
      claim.debtor.person?.business_name;

    const debtorAddress = claim.debtor.person?.address || "";

    const abbCharge = claim.charges.find((c) => c.concept === "ABB (belasting)");

    const params: SommatiePDFProps = {
      logoUrl: process.env.NEXT_PUBLIC_LOGO_URL || "",
      date: formatDate(claim.createdAt.toString()),
      debtorName: debtorName || "Debtor",
      debtorAddress: debtorAddress,
      island: island || "Bonaire",
      reference_number: claim.reference || "",
      total_amount: Number(claim.currentAmount).toFixed(2),
      amount_original: Number(claim.principalAmount).toFixed(2),
      calculatedABB: abbCharge ? Number(abbCharge.amount).toFixed(2) : "0.00",
      tenantName: claim.tenant.name || "Tenant",
      administrativeCosts: Number(0).toFixed(2),
      additionalCosts: Number(0).toFixed(2),
      additionalABB: Number(0).toFixed(2),
    };

    const pdfBase64 = await generatePdfBase64(<SommatiePDF {...params} />);

    const attachments = [{ filename: `Sommatie.pdf`, content: pdfBase64 }];

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

export const sendIngebrekestellingMail = async (
  to: string,
  caseId: string,
) => {
  try {
    const claim = await prisma.debtClaim.findUnique({
      where: { id: caseId },
      include: {
        tenant: true,
        debtor: { include: { person: true } },
        administrativeCollection: { include: { steps: true } },
      },
    });

    if (!claim) {
      throw new Error("Debt claim not found");
    }

    const parameter = await ParameterService.getParameter();

    if (!parameter) {
      throw new Error("Parameters not found");
    }

    const island = getNameCountry(claim.tenant.country_code);

    const debtorName =
      `${claim.debtor.person?.first_name} ${claim.debtor.person?.last_name}`.trim() ||
      claim.debtor.person?.business_name;

    const debtorAddress = claim.debtor.person?.address || "";

    const aopSteps = claim.administrativeCollection?.steps ?? [];
    const firstReminderStep = aopSteps.find((s) => s.step === "REMINDER");
    if (!firstReminderStep) {
      throw new Error("First reminder step not found");
    }
    const secondStep = aopSteps.find((s) => s.step === "FINAL_NOTICE");
    if (!secondStep) {
      throw new Error("Final notice step not found");
    }

    const params: IngebrekestellingProps = {
      logoUrl: process.env.NEXT_PUBLIC_LOGO_URL || "",
      date: formatDate(claim.createdAt.toString()),
      debtorName: debtorName || "Debtor",
      debtorAddress: debtorAddress || "",
      island: island || "Bonaire",
      referenceNumber: claim.reference || "",
      tenantName: claim.tenant.name || "Tenant",
    };

    const pdfBase64 = await generatePdfBase64(
      <IngebrekestellingPDF {...params} />,
    );

    const attachments = [
      { filename: `Ingebrekestelling.pdf`, content: pdfBase64 },
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
