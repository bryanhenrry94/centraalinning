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

export type PendingInvitation = {
  id: string;
  email: string;
  fullname: string | null;
  role: UserRole;
  created_at: Date;
  expires_at: Date;
};

export class InvitationService {
  static async register(
    params: InvitationParams,
  ): Promise<{ status: boolean; message: string; token?: string }> {
    const { tenantId, email, role, debtor_id } = params;

    if (!tenantId || !email || !role) {
      throw new Error("tenantId, email and role are required");
    }

    const user = await prisma.user.findFirst({ where: { email } });

    if (user) {
      return this.linkExistingUserToTenant(user.id, params);
    }

    const { fullname } = params;

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

  // El usuario ya existe (posiblemente en otro tenant): un mismo User puede
  // tener una Membership por tenant, cada una con su propio rol.
  private static async linkExistingUserToTenant(
    userId: string,
    { tenantId, role, debtor_id }: InvitationParams,
  ): Promise<{ status: boolean; message: string; token?: string }> {
    const membership = await prisma.membership.upsert({
      where: { user_id_tenant_id: { user_id: userId, tenant_id: tenantId } },
      update: {},
      create: {
        user_id: userId,
        tenant_id: tenantId,
        status: MembershipStatus.ACTIVE,
      },
    });

    await prisma.membershipRole.upsert({
      where: { membership_id_role: { membership_id: membership.id, role } },
      update: {},
      create: { membership_id: membership.id, role },
    });

    if (role === UserRole.DEBTOR && debtor_id) {
      await prisma.debtor.update({
        where: { id: debtor_id },
        data: { user_id: userId },
      });
    }

    return {
      status: true,
      message: "Existing user linked to tenant with the requested role",
    };
  }

  static async getPendingByTenant(tenantId: string): Promise<PendingInvitation[]> {
    const invitations = await prisma.tenantInvitation.findMany({
      where: { tenant_id: tenantId, used: false, expires_at: { gt: new Date() } },
      orderBy: { created_at: "desc" },
    });

    return invitations.map((invitation) => ({
      id: invitation.id,
      email: invitation.email,
      fullname: invitation.fullname,
      role: invitation.role as UserRole,
      created_at: invitation.created_at,
      expires_at: invitation.expires_at,
    }));
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
        throw new Error("Ongeldige of verlopen uitnodigingslink");
      }

      const tenant = await prisma.tenant.findUnique({
        where: { id: invitation.tenant_id, is_active: true },
      });

      if (!tenant) {
        throw new Error("Organisatie niet gevonden of inactief");
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
