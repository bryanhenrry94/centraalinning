import { MailService } from "@/infrastructure/mail/mail.service";

export class NotificationService {
  static async sendNotification(): Promise<void> {
    await MailService.sendPaymentLinkEmail("", "", "", 0, "");
  }
}
