"use server";
import { UserRole } from "@/shared/constants/user-role";
import { UserInput, UserResponse } from "@/modules/auth/services/user.type";
import { UserService } from "@/modules/auth/services/user.service";

export const getUserByEmail = async (email: string) => {
  return UserService.getByEmail(email);
};

export const getUserById = async (id: string) => {
  return UserService.getById(id);
};

export const getUsersByRole = async (roleName: UserRole): Promise<UserInput[]> => {
  return UserService.getByRole(roleName);
};

export const getUsersByTenantId = async (tenant_id: string): Promise<UserInput[]> => {
  return UserService.getByTenantId(tenant_id);
};

export const updateUserProfile = async (
  id: string,
  data: { fullname?: string; phone?: string },
) => {
  return UserService.updateProfile(id, data);
};

export const updateUserActiveStatus = async (
  user_id: string,
  is_active: boolean,
): Promise<UserInput> => {
  return UserService.updateActiveStatus(user_id, is_active);
};

export const userExistsByEmail = async (email: string): Promise<boolean> => {
  return UserService.existsByEmail(email);
};

export const userHasRole = async (
  user: UserResponse,
  role: UserRole,
): Promise<boolean> => {
  return UserService.hasRole(user, role);
};

export const userHasRoleInTenant = async (
  user: UserResponse,
  tenantId: string,
  role: UserRole,
): Promise<boolean> => {
  return UserService.hasRoleInTenant(user, tenantId, role);
};

export const userHasAnyRoleInTenant = async (
  user: UserResponse,
  tenantId: string,
  roles: UserRole[],
): Promise<boolean> => {
  return UserService.hasAnyRoleInTenant(user, tenantId, roles);
};

export const userHasAllRolesInTenant = async (
  user: UserResponse,
  tenantId: string,
  roles: UserRole[],
): Promise<boolean> => {
  return UserService.hasAllRolesInTenant(user, tenantId, roles);
};
