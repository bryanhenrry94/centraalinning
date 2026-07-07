"use server";
import { WorkspaceService } from "@/modules/auth/services/workspace.service";

export async function switchWorkspace(userId: string, tenantId: string) {
  return WorkspaceService.switchWorkspace(userId, tenantId);
}
