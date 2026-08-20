import { resend } from "@/infrastructure/mail/resend-client";
import { getEmailByEnv } from "@/shared/utils/mail";
import EmployerMatchEmail from "@/modules/collective-follow-up/templates/EmployerMatchEmail";

export const sendEmployerMatchNoticeEmail = async (
  to: string,
  fullname: string,
  employerName: string,
  deadlineDate: string,
) => {
  const recipient = await getEmailByEnv(to);

  const { error } = await resend.emails.send({
    from: `${process.env.EMAIL_SENDER_NAME} <${process.env.EMAIL_FROM}>`,
    to: recipient,
    subject: "CFSB - Werkgever geïdentificeerd",
    react: (
      <EmployerMatchEmail
        logoUrl={process.env.NEXT_PUBLIC_LOGO_URL || ""}
        fullname={fullname}
        employerName={employerName}
        deadlineDate={deadlineDate}
      />
    ),
  });

  if (error) {
    throw new Error(error.message);
  }
};
