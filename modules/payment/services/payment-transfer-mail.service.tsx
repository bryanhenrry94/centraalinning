import { resend } from "@/infrastructure/mail/resend-client";
import { getEmailByEnv } from "@/shared/utils/mail";
import { TransferPaymentVerificationEmail } from "@/modules/payment/templates/TransferPaymentVerificationEmail";
import { TransferPaymentApprovedEmail } from "@/modules/payment/templates/TransferPaymentApprovedEmail";
import { TransferPaymentRejectedEmail } from "@/modules/payment/templates/TransferPaymentRejectedEmail";

const APP_URL = process.env.APP_URL;

type SendVerificationInput = {
  to: string;
  debtorEmail: string;
  debtClaimReference: string;
  amount: number;
  referenceNumber: string;
  token: string;
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
          verificationLink={`${APP_URL}/payment-verification/${input.token}`}
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
