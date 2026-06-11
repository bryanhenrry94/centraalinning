"use server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import {
  IdTokenInput,
  LoginFormData,
  loginSchema,
} from "@/lib/validations/auth";
import { MembershipStatus } from "@prisma/client";

export const signInWithPassword = async (
  params: LoginFormData,
): Promise<{
  success: boolean;
  error?: string;
  data?: IdTokenInput;
}> => {
  const { email, password } = loginSchema.parse(params);

  const user = await prisma.user.findFirst({
    where: {
      email,
      is_active: true,
    },
    include: {
      memberships: {
        where: {
          status: MembershipStatus.ACTIVE,
        },
        include: {
          tenant: true,
          roles: true,
        },
      },
    },
  });

  if (!user || !user.password_hash) {
    return {
      success: false,
      error: "Credenciales incorrectas",
    };
  }

  const valid = await bcrypt.compare(password, user.password_hash);

  if (!valid) {
    return {
      success: false,
      error: "Credenciales incorrectas",
    };
  }

  if (user.memberships.length === 0) {
    return {
      success: false,
      error: "No tienes acceso a ningún espacio de trabajo",
    };
  }

  const activeMembership =
    user.memberships.find((m) => m.tenant_id === user.last_active_tenant_id) ??
    user.memberships[0];

  return {
    success: true,
    data: {
      id: user.id,
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
};

export const emailExists = async (email: string): Promise<boolean> => {
  if (!email) {
    throw new Error("Email is required");
  }

  const user = await prisma.user.findFirst({
    where: { email: email, is_active: true },
  });

  return !!user;
};
