import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { addMinutes } from "date-fns";
import { MembershipStatus } from "@prisma/client";
import {
  IdTokenInput,
  LoginFormData,
  loginSchema,
} from "@/modules/auth/services/auth.validators";

export class AuthService {
  static async resetPassword(token: string, newPassword: string) {
    try {
      const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

      const resetToken = await prisma.passwordResetToken.findUnique({
        where: { token_hash: tokenHash },
        include: { user: true },
      });

      if (!resetToken) {
        return { success: false, message: "Token ongeldig" };
      }

      if (resetToken.used_at) {
        return { success: false, message: "Token al gebruikt" };
      }

      if (resetToken.expires_at < new Date()) {
        return { success: false, message: "Token verlopen" };
      }

      const passwordHash = await bcrypt.hash(newPassword, 10);

      await prisma.$transaction([
        prisma.user.update({
          where: { id: resetToken.user_id },
          data: { password_hash: passwordHash },
        }),
        prisma.passwordResetToken.update({
          where: { id: resetToken.id },
          data: { used_at: new Date() },
        }),
      ]);

      return { success: true, message: "Wachtwoord succesvol bijgewerkt" };
    } catch (error) {
      console.error(error);
      return { success: false, message: "Er is een fout opgetreden" };
    }
  }

  static async signInWithPassword(
    params: LoginFormData,
  ): Promise<{ success: boolean; error?: string; data?: IdTokenInput }> {
    const { email, password } = loginSchema.parse(params);

    const user = await prisma.user.findFirst({
      where: { email, is_active: true },
      include: {
        memberships: {
          where: { status: MembershipStatus.ACTIVE },
          include: { tenant: true, roles: true },
        },
      },
    });

    if (!user || !user.password_hash) {
      return { success: false, error: "Credenciales incorrectas" };
    }

    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      return { success: false, error: "Credenciales incorrectas" };
    }

    if (user.memberships.length === 0) {
      return {
        success: false,
        error: "U hebt geen toegang tot een werkruimte.",
      };
    }

    const activeMembership =
      user.memberships.find(
        (m) => m.tenant_id === user.last_active_tenant_id,
      ) ?? user.memberships[0];

    return {
      success: true,
      data: {
        id: user.id,
        code: activeMembership.tenant.code,
        fullname: user.fullname || "",
        email: user.email,
        phone: user.phone || "",
        tenant_id: activeMembership.tenant.id,
        subdomain: activeMembership.tenant.subdomain,
        company: activeMembership.tenant.name,
        roles: activeMembership.roles.map((r) => r.role),
        email_verified: user.is_active,
        memberships: user.memberships.map((membership) => ({
          id: membership.id,
          tenantId: membership.tenant.id,
          tenantName: membership.tenant.name,
          subdomain: membership.tenant.subdomain,
          status: membership.status,
          roles: membership.roles.map((r) => r.role),
        })),
      },
    };
  }

  static async emailExists(email: string): Promise<boolean> {
    if (!email) throw new Error("Email is required");
    const user = await prisma.user.findFirst({
      where: { email, is_active: true },
    });
    return !!user;
  }

  static async createPasswordResetToken(email: string) {
    const user = await prisma.user.findFirst({ where: { email } });

    if (!user) return null;

    await prisma.passwordResetToken.deleteMany({
      where: { user_id: user.id, used_at: null },
    });

    const rawToken = crypto.randomBytes(32).toString("hex");
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

    return { user, rawToken };
  }
}
