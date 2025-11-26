"use server";
import prisma from "@/lib/prisma";
import { User } from "@/lib/validations/user";
import { $Enums } from "@/prisma/generated/prisma";

export const getUserByEmail = async (email: string) => {
  const user = await prisma.user.findFirst({
    where: {
      email: email,
    },
  });

  return user;
};

export const getUsersByRole = async (
  roleName: $Enums.UserRole
): Promise<User[]> => {
  const users = await prisma.user.findMany({
    where: {
      memberships: {
        some: {
          role: roleName,
        },
      },
    },
  });

  return users;
};

export const getUserById = async (id: string) => {
  const user = await prisma.user.findUnique({
    where: {
      id: id,
    },
  });

  return user;
};

export const updateUserProfile = async (
  id: string,
  data: { fullname?: string; phone?: string }
) => {
  const updatedUser = await prisma.user.update({
    where: {
      id: id,
    },
    data: {
      fullname: data.fullname,
      phone: data.phone,
    },
  });

  return updatedUser;
};

export const getUsersByTenantId = async (
  tenant_id: string
): Promise<User[]> => {
  const users = await prisma.user.findMany({
    where: {
      memberships: {
        some: {
          tenant_id: tenant_id,
        },
      },
    },
  });

  return users;
};

export const updateUserActiveStatus = async (
  user_id: string,
  is_active: boolean
): Promise<User> => {
  const updatedUser = await prisma.user.update({
    where: {
      id: user_id,
    },
    data: {
      is_active: is_active,
    },
  });

  return updatedUser;
};

export const userExistsByEmail = async (email: string): Promise<boolean> => {
  const user = await prisma.user.findFirst({
    where: { email: email },
  });

  return !!user;
};
