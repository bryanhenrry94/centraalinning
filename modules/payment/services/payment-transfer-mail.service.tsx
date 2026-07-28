import { resend } from "@/infrastructure/mail/resend-client";
import { getEmailByEnv } from "@/shared/utils/mail";
import { TransferPaymentVerificationEmail } from "@/modules/payment/templates/TransferPaymentVerificationEmail";
import { TransferPaymentApprovedEmail } from "@/modules/payment/templates/TransferPaymentApprovedEmail";
import { TransferPaymentRejectedEmail } from "@/modules/payment/templates/TransferPaymentRejectedEmail";
import { TransferPaymentReceiptEmail } from "@/modules/payment/templates/TransferPaymentReceiptEmail";

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "cio.test:3000";
const PROTOCOL = process.env.NODE_ENV === "production" ? "https" : "http";

function buildTenantUrl(subdomain: string, path: string) {
  return `${PROTOCOL}://${subdomain}.${ROOT_DOMAIN}${path}`;
}

type SendVerificationInput = {
  to: string;
  debtorEmail: string;
  debtClaimReference: string;
  amount: number;
  referenceNumber: string;
  token: string;
  tenantSubdomain: string;
};

export async function sendTransferPaymentVerificationEmail(
  input: SendVerificationInput,
): Promise<boolean> {
  try {
    const recipient = await getEmailByEnv(input.to);
    await resend.emails.send({
      from: `${process.env.EMAIL_SENDER_NAME} <${process.env.EMAIL_FROM}>`,
      to: recipient,
      subject: `Betalingsverificatie vereist - ${input.debtClaimReference}`,
      react: (
        <TransferPaymentVerificationEmail
          debtorEmail={input.debtorEmail}
          debtClaimReference={input.debtClaimReference}
          amount={input.amount}
          referenceNumber={input.referenceNumber}
          verificationLink={buildTenantUrl(
            input.tenantSubdomain,
            `/payment-verification/${input.token}`,
          )}
        />
      ),
    });
    return true;
  } catch (error) {
    console.error("Error sending transfer verification email:", error);
    return false;
  }
}

type SendApprovedInput = {
  to: string;
  debtClaimReference: string;
  amount: number;
};

export async function sendTransferPaymentApprovedEmail(
  input: SendApprovedInput,
): Promise<boolean> {
  try {
    const recipient = await getEmailByEnv(input.to);
    await resend.emails.send({
      from: `${process.env.EMAIL_SENDER_NAME} <${process.env.EMAIL_FROM}>`,
      to: recipient,
      subject: `Uw betaling is goedgekeurd - ${input.debtClaimReference}`,
      react: (
        <TransferPaymentApprovedEmail
          debtClaimReference={input.debtClaimReference}
          amount={input.amount}
        />
      ),
    });
    return true;
  } catch (error) {
    console.error("Error sending transfer approved email:", error);
    return false;
  }
}

type SendRejectedInput = {
  to: string;
  debtClaimReference: string;
  amount: number;
  reason?: string;
};

export async function sendTransferPaymentRejectedEmail(
  input: SendRejectedInput,
): Promise<boolean> {
  try {
    const recipient = await getEmailByEnv(input.to);
    await resend.emails.send({
      from: `${process.env.EMAIL_SENDER_NAME} <${process.env.EMAIL_FROM}>`,
      to: recipient,
      subject: `Uw betaling is afgewezen - ${input.debtClaimReference}`,
      react: (
        <TransferPaymentRejectedEmail
          debtClaimReference={input.debtClaimReference}
          amount={input.amount}
          reason={input.reason}
        />
      ),
    });
    return true;
  } catch (error) {
    console.error("Error sending transfer rejected email:", error);
    return false;
  }
}

type SendReceiptInput = {
  to: string;
  debtClaimReference: string;
  amount: number;
  decidedByName: string;
};

export async function sendTransferPaymentReceiptToTenant(
  input: SendReceiptInput,
): Promise<boolean> {
  try {
    const recipient = await getEmailByEnv(input.to);
    await resend.emails.send({
      from: `${process.env.EMAIL_SENDER_NAME} <${process.env.EMAIL_FROM}>`,
      to: recipient,
      subject: `Betaling bevestigd - ${input.debtClaimReference}`,
      react: (
        <TransferPaymentReceiptEmail
          debtClaimReference={input.debtClaimReference}
          amount={input.amount}
          decidedByName={input.decidedByName}
        />
      ),
    });
    return true;
  } catch (error) {
    console.error("Error sending transfer receipt email:", error);
    return false;
  }
}
