import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail({
  to,
  subject,
  html,
  attachments,
}: {
  to: string;
  subject: string;
  html: string;
  attachments?: { filename: string; content: string }[];
}) {
  return resend.emails.send({
    from: `PortalCI <${process.env.MAIL_FROM || "no-reply@centraalinning.com"}>`,
    to,
    subject,
    html,
    attachments,
  });
}
