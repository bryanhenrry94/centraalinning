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
import { NO_RESPONSE_FEE_DESCRIPTION } from "@/modules/collection/services/collection.service";

export const sendAanmaningEmail = async (
  to: string,
  caseId: string,
  invitationLink?: string,
  requiresRegistration?: boolean,
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
    const abbCharge = claim.charges.find(
      (c) => c.concept === "ABB (belasting)",
    );

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
      total_amount: Number(claim.principalAmount).toFixed(2),
      bankName: parameter.bank_name || "Bank Name",
      accountNumber: parameter.bank_account || "Account Number",
      amount_original: Number(claim.principalAmount).toFixed(2),
      extraCosts: feeCharge ? Number(feeCharge.amount).toFixed(2) : "0.00",
      calculatedABB: abbCharge ? Number(abbCharge.amount).toFixed(2) : "0.00",
      tenantName: claim.tenant.name || "Organisatie",
    };

    const pdfBase64 = await generatePdfBase64(<AanmaningPDF {...params} />);

    const attachments = [{ filename: `Aanmaning.pdf`, content: pdfBase64 }];

    const recipient = await getEmailByEnv(to);

    // Regla CFSB: el remitente visible es siempre CFSB (mismo dominio
    // verificado que usa Blokkade), no el nombre del tenant — las
    // respuestas del deudor van directo al contacto del participante vía
    // replyTo.
    const { data, error } = await resend.emails.send({
      from: `${process.env.EMAIL_SENDER_NAME} <${process.env.EMAIL_FROM}>`,
      replyTo: claim.tenant.contact_email,
      to: recipient,
      subject: "Aanmaning",
      react: (
        <AanmanningEmail
          logoUrl={process.env.NEXT_PUBLIC_LOGO_URL || ""}
          fullname={debtorName || "Debtor"}
          tenantName={claim.tenant.name}
          invitationLink={
            invitationLink ? invitationLink : "https://centraalinning.com/"
          }
          requiresRegistration={requiresRegistration}
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
        obligations: { orderBy: { createdAt: "asc" } },
        administrativeCollection: { include: { steps: true } },
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

    const feeCharge = claim.charges.find(
      (c) => c.concept === "Honorarios de cobranza",
    );
    const abbCharge = claim.charges.find(
      (c) => c.concept === "ABB (belasting)",
    );

    // Recargo por no responder la aanmaning dentro del plazo (ver
    // CollectionService.applyNoResponseFee). Se modela como
    // DebtClaimObligation (COLLECTION/CFSB), no como ClaimCharge, porque es
    // una obligación del deudor directamente con CFSB. Se identifica por su
    // descripción exacta (USD 150 por defecto), nunca por posición en el
    // array de obligations — este también contiene "AOP-activeringskosten"
    // y "AOP-kosten" con el mismo type/beneficiary.
    const additionalCosts = claim.obligations
      .filter(
        (o) =>
          o.type === "COLLECTION" &&
          o.beneficiary === "CFSB" &&
          o.description === NO_RESPONSE_FEE_DESCRIPTION.REMINDER,
      )
      .reduce((sum, o) => sum + Number(o.originalAmount), 0);

    const aanmaningSentAt = claim.administrativeCollection?.steps.find(
      (s) => s.step === "REMINDER",
    )?.sentAt;

    const administrativeCosts = feeCharge ? Number(feeCharge.amount) : 0;
    const calculatedABBAmount = abbCharge ? Number(abbCharge.amount) : 0;
    const additionalABBAmount = 0;

    const totalAmount =
      Number(claim.principalAmount) +
      administrativeCosts +
      calculatedABBAmount +
      additionalCosts +
      additionalABBAmount;

    const params: SommatiePDFProps = {
      logoUrl: process.env.NEXT_PUBLIC_LOGO_URL || "",
      date: formatDate(claim.createdAt.toString()),
      aanmaningDate: aanmaningSentAt
        ? formatDate(aanmaningSentAt.toString())
        : formatDate(claim.createdAt.toString()),
      debtorName: debtorName || "Debtor",
      debtorAddress: debtorAddress,
      island: island || "Bonaire",
      reference_number: claim.reference || "",
      total_amount: totalAmount.toFixed(2),
      amount_original: Number(claim.principalAmount).toFixed(2),
      calculatedABB: calculatedABBAmount.toFixed(2),
      tenantName: claim.tenant.name || "Organisatie",
      administrativeCosts: administrativeCosts.toFixed(2),
      additionalCosts: additionalCosts.toFixed(2),
      additionalABB: additionalABBAmount.toFixed(2),
    };

    const pdfBase64 = await generatePdfBase64(<SommatiePDF {...params} />);

    const attachments = [{ filename: `Sommatie.pdf`, content: pdfBase64 }];

    const recipient = await getEmailByEnv(to);

    const { data, error } = await resend.emails.send({
      from: `${process.env.EMAIL_SENDER_NAME} <${process.env.EMAIL_FROM}>`,
      replyTo: claim.tenant.contact_email,
      to: recipient,
      subject: "Sommatie",
      react: (
        <SommatieMail
          logoUrl={process.env.NEXT_PUBLIC_LOGO_URL || ""}
          fullname={debtorName || "Debtor"}
          tenantName={claim.tenant.name}
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

export const sendIngebrekestellingMail = async (to: string, caseId: string) => {
  try {
    const claim = await prisma.debtClaim.findUnique({
      where: { id: caseId },
      include: {
        tenant: true,
        debtor: { include: { person: true } },
        administrativeCollection: { include: { steps: true } },
        charges: true,
        obligations: { orderBy: { createdAt: "asc" } },
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

    const aopSteps = claim.administrativeCollection?.steps ?? [];
    const firstReminderStep = aopSteps.find((s) => s.step === "REMINDER");
    if (!firstReminderStep) {
      throw new Error("First reminder step not found");
    }
    const secondStep = aopSteps.find((s) => s.step === "FINAL_NOTICE");
    if (!secondStep) {
      throw new Error("Final notice step not found");
    }

    const feeCharge = claim.charges.find(
      (c) => c.concept === "Honorarios de cobranza",
    );
    const abbCharge = claim.charges.find(
      (c) => c.concept === "ABB (belasting)",
    );

    // Suma de los recargos por incumplimiento (aanmaning USD 150 + sommatie
    // USD 250 sin respuesta), identificados por su descripción exacta —
    // igual que en sendSommatieEmail, nunca por posición en el array de
    // obligations (que también contiene "AOP-activeringskosten" y
    // "AOP-kosten" con el mismo type/beneficiary).
    const noResponseFeesTotal = claim.obligations
      .filter(
        (o) =>
          o.type === "COLLECTION" &&
          o.beneficiary === "CFSB" &&
          (o.description === NO_RESPONSE_FEE_DESCRIPTION.REMINDER ||
            o.description === NO_RESPONSE_FEE_DESCRIPTION.FINAL_NOTICE),
      )
      .reduce((sum, o) => sum + Number(o.originalAmount), 0);

    const totalAmount =
      Number(claim.principalAmount) +
      (feeCharge ? Number(feeCharge.amount) : 0) +
      (abbCharge ? Number(abbCharge.amount) : 0) +
      noResponseFeesTotal;

    const params: IngebrekestellingProps = {
      logoUrl: process.env.NEXT_PUBLIC_LOGO_URL || "",
      date: formatDate(claim.createdAt.toString()),
      debtorName: debtorName || "Debtor",
      debtorAddress: debtorAddress || "",
      island: island || "Bonaire",
      referenceNumber: claim.reference || "",
      tenantName: claim.tenant.name || "Organisatie",
      aanmaningDate: firstReminderStep.sentAt
        ? formatDate(firstReminderStep.sentAt.toString())
        : formatDate(claim.createdAt.toString()),
      sommatieDate: secondStep.sentAt
        ? formatDate(secondStep.sentAt.toString())
        : formatDate(claim.createdAt.toString()),
      totalAmount: totalAmount.toFixed(2),
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
      replyTo: claim.tenant.contact_email,
      to: recipient,
      subject: "Ingebrekestelling",
      react: (
        <IngebrekestellingEmail
          logoUrl={process.env.NEXT_PUBLIC_LOGO_URL || ""}
          fullname={debtorName || "Debtor"}
          tenantName={claim.tenant.name}
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
