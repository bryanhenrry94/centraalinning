"use server";
import { UserRole } from "@/constants/user-role";
import { prisma } from "@/lib/prisma";
import {
  InvitationRegistration,
  InvitationRegistrationSchema,
} from "@/lib/validations/tenant-invitation";
import bcrypt from "bcryptjs";

import { revalidatePath } from "next/cache";

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

export const registerInvitation = async (
  params: InvitationParams,
): Promise<{ status: boolean; message: string; token?: string }> => {
  const { tenantId, email, role, fullname, debtor_id } = params;

  const user = await prisma.user.findFirst({
    where: { email: email },
  });

  if (user) {
    return { status: false, message: "User with this email already exists" };
  }

  if (!tenantId) {
    throw new Error("Tenant ID is required");
  }
  if (!email) {
    throw new Error("Email is required");
  }
  if (!role) {
    throw new Error("Role is required");
  }

  // valida que no exista una invitacion pendiente para el mismo email y tenant
  const existingInvitation = await prisma.tenantInvitation.findFirst({
    where: {
      tenant_id: tenantId,
      email: email,
      expires_at: {
        gt: new Date(),
      },
    },
  });

  console.log("Existing invitation check:", existingInvitation);

  if (existingInvitation) {
    return {
      status: false,
      message: "There is already a pending invitation for this email",
    };
  }

  const invitation = await prisma.tenantInvitation.create({
    data: {
      tenant_id: tenantId,
      email: email,
      fullname: fullname || null,
      role: role,
      debtor_id: debtor_id || null,
      token: crypto.randomUUID(),
      created_at: new Date(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Expires in 7 days
    },
  });

  console.log("New invitation created:", invitation);

  return {
    status: true,
    message: "Invitation registered",
    token: invitation.token,
  };
};

export const isInvitationValid = async (token: string): Promise<boolean> => {
  const invitation = await prisma.tenantInvitation.findFirst({
    where: {
      token: token,
      expires_at: {
        gt: new Date(),
      },
    },
  });

  return invitation ? true : false;
};

export const invitationIsUsed = async (token: string): Promise<boolean> => {
  const invitation = await prisma.tenantInvitation.findFirst({
    where: {
      token: token,
      used: true,
    },
  });

  return invitation ? true : false;
};

export const getInvitationDetails = async (
  token: string,
): Promise<InvitationDetails | null> => {
  const invitation = await prisma.tenantInvitation.findFirst({
    where: {
      token: token,
      expires_at: {
        gt: new Date(),
      },
    },
  });

  if (!invitation) {
    return null;
  }

  return {
    token: invitation.token,
    tenantId: invitation.tenant_id,
    email: invitation.email,
    role: invitation.role as UserRole,
    fullname: invitation.fullname || undefined,
    debtor_id: invitation.debtor_id || undefined,
  };
};

export const completeRegistration = async (
  payload: InvitationRegistration,
): Promise<{ status: boolean; subdomain?: string; error?: string }> => {
  try {
    // ✅ 1. Validar datos de entrada
    const validatedData = InvitationRegistrationSchema.parse(payload);

    // ✅ 2. Verificar token de invitación
    const invitation = await prisma.tenantInvitation.findFirst({
      where: {
        token: payload.token,
        expires_at: {
          gt: new Date(),
        },
      },
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

    // ✅ 2. Crear usuario deudor
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
        created_at: new Date(),
      },
    });

    const membershipRole = await prisma.membershipRole.create({
      data: {
        membership_id: membership.id,
        role: invitation.role as UserRole,
      },
    });

    if (invitation.role === UserRole.DEBTOR && invitation.debtor_id) {
      // 3. Actualizar información del deudor si es necesario
      await prisma.debtor.update({
        where: { id: invitation.debtor_id },
        data: {
          email: validatedData.email,
          user_id: user.id, // Asignar el user_id si es necesario
        },
      });
    }

    // 4. Actualizar invitación como usada
    await prisma.tenantInvitation.update({
      where: { id: invitation.id },
      data: {
        used_at: new Date(),
        used: true,
      },
    });

    // ✅ 3. Revalidar caché si es necesario
    revalidatePath("/invitation");

    return { status: true, subdomain: tenant.subdomain };
  } catch (error: any) {
    console.error("Error creating debtor account:", error);
    return { status: false, error: error.message };
  }
};
