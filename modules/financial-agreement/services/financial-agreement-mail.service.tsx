import { resend } from "@/infrastructure/mail/resend-client";
import { getEmailByEnv } from "@/shared/utils/mail";
import FarRegisteredEmail from "@/modules/financial-agreement/templates/FarRegisteredEmail";

type SendFarRegisteredMailParams = {
  to: string;
  fullname: string;
  introText: string;
  farNumber: string;
  registeredAt: string;
  tenantName: string;
};

const sendFarRegisteredMail = async ({
  to,
  fullname,
  introText,
  farNumber,
  registeredAt,
  tenantName,
}: SendFarRegisteredMailParams) => {
  try {
    const recipient = await getEmailByEnv(to);

    const { error } = await resend.emails.send({
      from: `${process.env.EMAIL_SENDER_NAME} <${process.env.EMAIL_FROM}>`,
      to: recipient,
      subject: `CFSB - FAR-registratie bevestigd (${farNumber})`,
      react: (
        <FarRegisteredEmail
          logoUrl={process.env.NEXT_PUBLIC_LOGO_URL || ""}
          fullname={fullname}
          introText={introText}
          farNumber={farNumber}
          registeredAt={registeredAt}
          tenantName={tenantName}
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
// CFSB registró la afspraak en su nombre.
export const sendFarRegisteredMailToDebtor = async (params: {
  to: string;
  debtorFullname: string;
  farNumber: string;
  registeredAt: string;
  tenantName: string;
}) => {
  await sendFarRegisteredMail({
    to: params.to,
    fullname: params.debtorFullname || "Klant",
    introText:
      `Namens ${params.tenantName} is er een financiële afspraak (FAR) op uw naam geregistreerd binnen ` +
      "de CFSB-samenwerking. Hieronder vindt u de registratiegegevens ter bevestiging.",
    farNumber: params.farNumber,
    registeredAt: params.registeredAt,
    tenantName: params.tenantName,
  });
};

// Correo al cliente (tenant) que registró el FAR: confirma que el pago de
// la tarifa de registro se procesó correctamente.
export const sendFarRegisteredMailToTenant = async (params: {
  to: string;
  tenantContactName: string;
  farNumber: string;
  registeredAt: string;
  tenantName: string;
}) => {
  await sendFarRegisteredMail({
    to: params.to,
    fullname: params.tenantContactName || params.tenantName,
    introText:
      "Uw registratie van een financiële afspraak (FAR) is bevestigd. De registratiekosten zijn " +
      "succesvol ontvangen en de afspraak staat nu geregistreerd.",
    farNumber: params.farNumber,
    registeredAt: params.registeredAt,
    tenantName: params.tenantName,
  });
};
