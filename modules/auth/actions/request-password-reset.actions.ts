"use server";
import { sendMailRecoveryPassword } from "@/modules/auth/services/auth-mail.service";
import { AuthService } from "@/modules/auth/services/auth.service";

export async function requestPasswordReset(email: string) {
  try {
    const result = await AuthService.createPasswordResetToken(email);

    if (!result) {
      return {
        success: true,
        message:
          "Als het e-mailadres bestaat, ontvang je instructies om je wachtwoord opnieuw in te stellen.",
      };
    }

    const { user, rawToken } = result;
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${rawToken}`;

    await sendMailRecoveryPassword(user.email, user.fullname || "User", resetUrl);

    return {
      success: true,
      message:
        "Als het e-mailadres bestaat, ontvang je instructies om je wachtwoord opnieuw in te stellen.",
    };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Ocurrió un error" };
  }
}
