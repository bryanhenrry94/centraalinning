"use server";
import {
  IdTokenInput,
  LoginFormData,
} from "@/modules/auth/services/auth.validators";
import { AuthService } from "@/modules/auth/services/auth.service";

export const signInWithPassword = async (
  params: LoginFormData,
): Promise<{ success: boolean; error?: string; data?: IdTokenInput }> => {
  return AuthService.signInWithPassword(params);
};

export const emailExists = async (email: string): Promise<boolean> => {
  return AuthService.emailExists(email);
};
