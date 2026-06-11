import { Resend } from "resend";

import { formatCurrency } from "@/utils/formatters";
import { getEmailByEnv } from "@/utils/mail";

import PaymentLinkEmail, {
  PaymentLinkEmailProps,
} from "@/templates/emails/PaymentLinkEmail";

const resend = new Resend(process.env.RESEND_API_KEY);

export class MailService {
  static async sendPaymentLinkEmail(
    to: string,
    fullname: string,
    paymentLink: string,
    amount?: number,
    referenceNumber?: string,
  ): Promise<void> {
    const recipient = await getEmailByEnv(to);

    const params: PaymentLinkEmailProps = {
      fullname,
      paymentLink,
      amount,
      referenceNumber,
    };

    await resend.emails.send({
      from: `${process.env.EMAIL_SENDER_NAME} <${process.env.EMAIL_FROM}>`,
      to: recipient,
      subject: amount
        ? `Betalingsverzoek voor ${formatCurrency(amount)}`
        : "Betalingsverzoek",
      react: <PaymentLinkEmail {...params} />,
    });
  }
}
