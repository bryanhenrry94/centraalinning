"use server";

import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import bcrypt from "bcryptjs";

export async function resetPassword(token: string, newPassword: string) {
  try {
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: {
        token_hash: tokenHash,
      },
      include: {
        user: true,
      },
    });

    if (!resetToken) {
      return {
        success: false,
        message: "Token ongeldig",
      };
    }

    if (resetToken.used_at) {
      return {
        success: false,
        message: "Token al gebruikt",
      };
    }

    if (resetToken.expires_at < new Date()) {
      return {
        success: false,
        message: "Token verlopen",
      };
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.$transaction([
      prisma.user.update({
        where: {
          id: resetToken.user_id,
        },
        data: {
          password_hash: passwordHash,
        },
      }),

      prisma.passwordResetToken.update({
        where: {
          id: resetToken.id,
        },
        data: {
          used_at: new Date(),
        },
      }),
    ]);

    return {
      success: true,
      message: "Wachtwoord succesvol bijgewerkt",
    };
  } catch (error) {
    console.error(error);

    return {
      success: false,
      message: "Er is een fout opgetreden",
    };
  }
}
