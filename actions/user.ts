"use server";

import { UserRole } from "@/constants/user-role";
import { prisma } from "@/lib/prisma";
import { UserInput, UserResponse } from "@/services/auth/user.type";

const mapUser = (user: any): UserResponse => ({
  id: user.id,
  email: user.email,
  fullname: user.fullname,
  phone: user.phone,
  is_active: user.is_active,
  memberships:
    user.memberships?.map((membership: any) => ({
      id: membership.id,
      user_id: membership.user_id,
      tenant_id: membership.tenant_id,
      status: membership.status,
      roles: membership.roles?.map((role: any) => role.role as UserRole) || [],
    })) || [],
  created_at: user.created_at,
  updated_at: user.updated_at,
});

export const getUserByEmail = async (email: string) => {
  return prisma.user.findUnique({
    where: {
      email,
    },

    include: {
      memberships: {
        include: {
          tenant: true,
          roles: true,
        },
      },
    },
  });
};

export const getUserById = async (id: string) => {
  return prisma.user.findUnique({
    where: {
      id,
    },

    include: {
      memberships: {
        include: {
          tenant: true,
          roles: true,
        },
      },
    },
  });
};

export const getUsersByRole = async (
  roleName: UserRole,
): Promise<UserInput[]> => {
  const users = await prisma.user.findMany({
    where: {
      memberships: {
        some: {
          roles: {
            some: {
              role: roleName,
            },
          },
        },
      },
    },

    include: {
      memberships: {
        include: {
          roles: true,
        },
      },
    },
  });

  return users.map(mapUser);
};

export const getUsersByTenantId = async (
  tenant_id: string,
): Promise<UserInput[]> => {
  const users = await prisma.user.findMany({
    where: {
      memberships: {
        some: {
          tenant_id,
        },
      },
    },

    include: {
      memberships: {
        include: {
          roles: true,
        },
      },
    },
  });

  return users.map(mapUser);
};

export const updateUserProfile = async (
  id: string,
  data: {
    fullname?: string;
    phone?: string;
  },
) => {
  return prisma.user.update({
    where: {
      id,
    },

    data: {
      fullname: data.fullname,
      phone: data.phone,
    },
  });
};

export const updateUserActiveStatus = async (
  user_id: string,
  is_active: boolean,
): Promise<UserInput> => {
  const updatedUser = await prisma.user.update({
    where: {
      id: user_id,
    },

    data: {
      is_active,
    },

    include: {
      memberships: {
        include: {
          roles: true,
        },
      },
    },
  });

  return mapUser(updatedUser);
};

export const userExistsByEmail = async (email: string): Promise<boolean> => {
  const user = await prisma.user.findUnique({
    where: {
      email,
    },

    select: {
      id: true,
    },
  });

  return !!user;
};

/**
 * Helpers (non-server action utilities)
 */

export const userHasRole = async (
  user: UserResponse,
  role: UserRole,
): Promise<boolean> => {
  return await user.memberships.some((membership) =>
    membership.roles.includes(role),
  );
};

export const userHasRoleInTenant = async (
  user: UserResponse,
  tenantId: string,
  role: UserRole,
): Promise<boolean> => {
  const membership = await user.memberships.find(
    (m) => m.tenantId === tenantId,
  );

  if (!membership) {
    return false;
  }

  return membership.roles.includes(role);
};

export const userHasAnyRoleInTenant = async (
  user: UserResponse,
  tenantId: string,
  roles: UserRole[],
): Promise<boolean> => {
  const membership = await user.memberships.find(
    (m) => m.tenantId === tenantId,
  );

  if (!membership) {
    return false;
  }

  return roles.some((role) => membership.roles.includes(role));
};

export const userHasAllRolesInTenant = async (
  user: UserResponse,
  tenantId: string,
  roles: UserRole[],
): Promise<boolean> => {
  const membership = await user.memberships.find(
    (m) => m.tenantId === tenantId,
  );

  if (!membership) {
    return false;
  }

  return roles.every((role) => membership.roles.includes(role));
};
