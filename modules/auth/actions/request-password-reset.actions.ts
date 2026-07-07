"use server";

import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { addMinutes } from "date-fns";
import { sendMailRecoveryPassword } from "@/modules/auth/services/auth-mail.service";

export async function requestPasswordReset(email: string) {
  try {
    const user = await prisma.user.findFirst({
      where: { email },
    });

    // Nooit onthullen of het bestaat of niet
    if (!user) {
      return {
        success: true,
        message:
          "Als het e-mailadres bestaat, ontvang je instructies om je wachtwoord opnieuw in te stellen.",
      };
    }

    // Eerdere tokens ongeldig maken
    await prisma.passwordResetToken.deleteMany({
      where: {
        user_id: user.id,
        used_at: null,
      },
    });

    // Openbare token
    const rawToken = crypto.randomBytes(32).toString("hex");

    // Hash om op te slaan in db
    const tokenHash = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    await prisma.passwordResetToken.create({
      data: {
        user_id: user.id,
        token_hash: tokenHash,
        expires_at: addMinutes(new Date(), 30),
      },
    });

    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${rawToken}`;

    // TODO: E-mail versturen
    console.log(resetUrl);

    await sendMailRecoveryPassword(
      user.email,
      user.fullname || "User",
      resetUrl,
    );

    return {
      success: true,
      message:
        "Als het e-mailadres bestaat, ontvang je instructies om je wachtwoord opnieuw in te stellen.",
    };
  } catch (error) {
    console.error(error);

    return {
      success: false,
      message: "Ocurrió un error",
    };
  }
}
