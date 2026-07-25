import { prisma } from "@/lib/prisma";
import { UserRole } from "@/shared/constants/user-role";
import {
  InvitationRegistration,
  InvitationRegistrationSchema,
} from "@/modules/auth/services/invitation.validators";
import bcrypt from "bcryptjs";
import { MembershipStatus } from "@prisma/client";

type InvitationParams = {
  tenantId: string;
  email: string;
  role: UserRole;
  fullname?: string;
  debtor_id?: string;
};

type InvitationDetails = {
  token: string;
  tenantId: string;
  email: string;
  role: UserRole;
  fullname?: string;
  debtor_id?: string;
};

export class InvitationService {
  static async register(
    params: InvitationParams,
  ): Promise<{ status: boolean; message: string; token?: string }> {
    const { tenantId, email, role, fullname, debtor_id } = params;

    const user = await prisma.user.findFirst({ where: { email } });

    if (user) {
      return { status: false, message: "User with this email already exists" };
    }

    if (!tenantId || !email || !role) {
      throw new Error("tenantId, email and role are required");
    }

    const existingInvitation = await prisma.tenantInvitation.findFirst({
      where: { tenant_id: tenantId, email, expires_at: { gt: new Date() } },
    });

    if (existingInvitation) {
      return {
        status: false,
        message: "There is already a pending invitation for this email",
      };
    }

    const invitation = await prisma.tenantInvitation.create({
      data: {
        tenant_id: tenantId,
        email,
        fullname: fullname || null,
        role,
        debtor_id: debtor_id || null,
        token: crypto.randomUUID(),
        created_at: new Date(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return { status: true, message: "Invitation registered", token: invitation.token };
  }

  static async isValid(token: string): Promise<boolean> {
    const invitation = await prisma.tenantInvitation.findFirst({
      where: { token, expires_at: { gt: new Date() } },
    });
    return !!invitation;
  }

  static async isUsed(token: string): Promise<boolean> {
    const invitation = await prisma.tenantInvitation.findFirst({
      where: { token, used: true },
    });
    return !!invitation;
  }

  static async getDetails(token: string): Promise<InvitationDetails | null> {
    const invitation = await prisma.tenantInvitation.findFirst({
      where: { token, expires_at: { gt: new Date() } },
    });

    if (!invitation) return null;

    return {
      token: invitation.token,
      tenantId: invitation.tenant_id,
      email: invitation.email,
      role: invitation.role as UserRole,
      fullname: invitation.fullname || undefined,
      debtor_id: invitation.debtor_id || undefined,
    };
  }

  static async completeRegistration(
    payload: InvitationRegistration,
  ): Promise<{ status: boolean; subdomain?: string; error?: string }> {
    try {
      const validatedData = InvitationRegistrationSchema.parse(payload);

      const invitation = await prisma.tenantInvitation.findFirst({
        where: { token: payload.token, expires_at: { gt: new Date() } },
      });

      if (!invitation) {
        throw new Error("Invalid or expired invitation token");
      }

      const tenant = await prisma.tenant.findUnique({
        where: { id: invitation.tenant_id, is_active: true },
      });

      if (!tenant) {
        throw new Error("Tenant not found or inactive");
      }

      const password_hash = await bcrypt.hash(validatedData.password, 10);

      const user = await prisma.user.create({
        data: {
          email: validatedData.email,
          fullname: validatedData.fullname,
          password_hash,
          is_active: true,
        },
      });

      const membership = await prisma.membership.create({
        data: {
          user_id: user.id,
          tenant_id: invitation.tenant_id,
          status: MembershipStatus.ACTIVE,
          created_at: new Date(),
        },
      });

      await prisma.membershipRole.create({
        data: { membership_id: membership.id, role: invitation.role as UserRole },
      });

      if (invitation.role === UserRole.DEBTOR && invitation.debtor_id) {
        await prisma.debtor.update({
          where: { id: invitation.debtor_id },
          data: { email: validatedData.email, user_id: user.id },
        });
      }

      await prisma.tenantInvitation.update({
        where: { id: invitation.id },
        data: { used_at: new Date(), used: true },
      });

      return { status: true, subdomain: tenant.subdomain };
    } catch (error: any) {
      console.error("Error creating debtor account:", error);
      return { status: false, error: error.message };
    }
  }
}
