// Re-export proxy — functions have been moved to their respective modules
export {
  sendWelcomeEmail,
  sendMailRecoveryPassword,
} from "@/modules/auth/services/auth-mail.service";

export { sendNewClitentEmail } from "@/modules/tenant/services/tenant-mail.service";

export {
  sendInvoiceEmail,
  sendFinancialReportMail,
} from "@/modules/payment/services/payment-mail.service";

export {
  sendAanmaningEmail,
  sendSommatieEmail,
  sendIngebrekestellingMail,
} from "@/modules/collection/services/collection-mail.service";

export {
  sendBlokkadeMail,
  sendMailBlockade,
} from "@/modules/blockade/services/blockade-mail.service";

export { sendActivateContractMail } from "@/modules/contract/services/contract-mail.service";

export {
  sendVerdictApprovalEmail,
  sendMailVerdictDebtor,
  sendMailVerdictCreditor,
  sendMailRegisterVerdict,
} from "@/modules/verdict/services/verdict-mail.service";
