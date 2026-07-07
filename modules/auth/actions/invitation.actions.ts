"use server";
import { UserRole } from "@/shared/constants/user-role";
import { InvitationRegistration } from "@/modules/auth/services/invitation.validators";
import { InvitationService } from "@/modules/auth/services/invitation.service";
import { revalidatePath } from "next/cache";

type InvitationParams = {
  tenantId: string;
  email: string;
  role: UserRole;
  fullname?: string;
  debtor_id?: string;
};

export const registerInvitation = async (
  params: InvitationParams,
): Promise<{ status: boolean; message: string; token?: string }> => {
  return InvitationService.register(params);
};

export const isInvitationValid = async (token: string): Promise<boolean> => {
  return InvitationService.isValid(token);
};

export const invitationIsUsed = async (token: string): Promise<boolean> => {
  return InvitationService.isUsed(token);
};

export const getInvitationDetails = async (token: string) => {
  return InvitationService.getDetails(token);
};

export const completeRegistration = async (
  payload: InvitationRegistration,
): Promise<{ status: boolean; subdomain?: string; error?: string }> => {
  const result = await InvitationService.completeRegistration(payload);
  if (result.status) revalidatePath("/invitation");
  return result;
};
