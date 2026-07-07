"use server";
import { AuthService } from "@/modules/auth/services/auth.service";

export async function resetPassword(token: string, newPassword: string) {
  return AuthService.resetPassword(token, newPassword);
}
