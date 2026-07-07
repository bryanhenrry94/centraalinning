import { prisma } from "@/lib/prisma";
import { UserRole } from "@/shared/constants/user-role";
import { UserInput, UserResponse } from "@/modules/auth/services/user.type";

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

export class UserService {
  static async getByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
      include: {
        memberships: {
          include: { tenant: true, roles: true },
        },
      },
    });
  }

  static async getById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      include: {
        memberships: {
          include: { tenant: true, roles: true },
        },
      },
    });
  }

  static async getByRole(roleName: UserRole): Promise<UserInput[]> {
    const users = await prisma.user.findMany({
      where: {
        memberships: {
          some: { roles: { some: { role: roleName } } },
        },
      },
      include: { memberships: { include: { roles: true } } },
    });
    return users.map(mapUser);
  }

  static async getByTenantId(tenant_id: string): Promise<UserInput[]> {
    const users = await prisma.user.findMany({
      where: { memberships: { some: { tenant_id } } },
      include: { memberships: { include: { roles: true } } },
    });
    return users.map(mapUser);
  }

  static async updateProfile(id: string, data: { fullname?: string; phone?: string }) {
    return prisma.user.update({ where: { id }, data });
  }

  static async updateActiveStatus(user_id: string, is_active: boolean): Promise<UserInput> {
    const updated = await prisma.user.update({
      where: { id: user_id },
      data: { is_active },
      include: { memberships: { include: { roles: true } } },
    });
    return mapUser(updated);
  }

  static async existsByEmail(email: string): Promise<boolean> {
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    return !!user;
  }

  static hasRole(user: UserResponse, role: UserRole): boolean {
    return user.memberships.some((m) => m.roles.includes(role));
  }

  static hasRoleInTenant(user: UserResponse, tenantId: string, role: UserRole): boolean {
    const membership = user.memberships.find((m) => m.tenantId === tenantId);
    return !!membership && membership.roles.includes(role);
  }

  static hasAnyRoleInTenant(user: UserResponse, tenantId: string, roles: UserRole[]): boolean {
    const membership = user.memberships.find((m) => m.tenantId === tenantId);
    return !!membership && roles.some((r) => membership.roles.includes(r));
  }

  static hasAllRolesInTenant(user: UserResponse, tenantId: string, roles: UserRole[]): boolean {
    const membership = user.memberships.find((m) => m.tenantId === tenantId);
    return !!membership && roles.every((r) => membership.roles.includes(r));
  }
}
