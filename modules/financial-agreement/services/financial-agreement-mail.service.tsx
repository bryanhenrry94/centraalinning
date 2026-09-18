import { resend } from "@/infrastructure/mail/resend-client";
import { getEmailByEnv } from "@/shared/utils/mail";
import FarRegisteredEmail from "@/modules/financial-agreement/templates/FarRegisteredEmail";

type FarRegisteredMailDetails = {
  farNumber: string;
  registeredAt: string;
  tenantName: string;
  debtorTypeLabel: string;
  debtorName: string;
  debtorIdentification: string;
  debtorAddress: string;
  debtorPhone: string;
  debtorEmail: string;
  agreementDescription: string;
  agreementReference: string;
  agreementInvoiceDate: string;
  agreementDueDate: string;
  agreementAmount: string;
  documentsCount: number;
  feeExclAbb: string;
  abbLabel: string;
  totalPaid: string;
};

type SendFarRegisteredMailParams = FarRegisteredMailDetails & {
  to: string;
  fullname: string;
  introText: string;
};

const sendFarRegisteredMail = async ({
  to,
  fullname,
  introText,
  ...details
}: SendFarRegisteredMailParams) => {
  try {
    const recipient = await getEmailByEnv(to);

    const { error } = await resend.emails.send({
      from: `${process.env.EMAIL_SENDER_NAME} <${process.env.EMAIL_FROM}>`,
      to: recipient,
      subject: `CFSB - FAR-registratie bevestigd (${details.farNumber})`,
      react: (
        <FarRegisteredEmail
          logoUrl={process.env.NEXT_PUBLIC_LOGO_URL || ""}
          fullname={fullname}
          introText={introText}
          {...details}
        />
      ),
    });

    if (error) {
      console.error("Error sending FAR registration confirmation email:", error);
    }
  } catch (error) {
    console.error("Error sending FAR registration confirmation email:", error);
  }
};

// Correo al deudor (Wederpartij) ligado al contrato/acuerdo: confirma que
// CFSB registró de afspraak op zijn naam, met de volledige voorwaarden
// (bedrag, vervaldatum, kosten) zodat beide partijen duidelijkheid hebben.
export const sendFarRegisteredMailToDebtor = async (
  params: FarRegisteredMailDetails & { to: string },
) => {
  const { to, ...details } = params;
  await sendFarRegisteredMail({
    to,
    fullname: details.debtorName || "Klant",
    introText:
      `Namens ${details.tenantName} is er een financiële afspraak (FAR) op uw naam geregistreerd binnen ` +
      "de CFSB-samenwerking. Hieronder vindt u de volledige registratiegegevens ter bevestiging.",
    ...details,
  });
};

// Correo al cliente (tenant) que registró el FAR: confirma que el pago de
// la tarifa de registro se procesó correctamente, con el mismo detalle que
// se mostró en el resumen del wizard al momento de registrar.
export const sendFarRegisteredMailToTenant = async (
  params: FarRegisteredMailDetails & { to: string; tenantContactName: string },
) => {
  const { to, tenantContactName, ...details } = params;
  await sendFarRegisteredMail({
    to,
    fullname: tenantContactName || details.tenantName,
    introText:
      "Uw registratie van een financiële afspraak (FAR) is bevestigd. De registratiekosten zijn " +
      "succesvol ontvangen en de afspraak staat nu geregistreerd. Hieronder vindt u het volledige overzicht.",
    ...details,
  });
};
