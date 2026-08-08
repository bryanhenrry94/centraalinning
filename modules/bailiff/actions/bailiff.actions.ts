"use server";
import {
  Bailiff,
  BailiffUpdate,
} from "@/modules/bailiff/services/bailiff.validators";
import { BailiffService } from "@/modules/bailiff/services/bailiff.service";

export async function getBailiffById(
  id: string,
): Promise<{ success: boolean; data?: Bailiff; error?: string }> {
  return BailiffService.getById(id);
}

export async function updateBailiff(
  id: string,
  data: Partial<BailiffUpdate>,
): Promise<{ success: boolean; data?: Bailiff; error?: string }> {
  return BailiffService.update(id, data);
}

export async function getAllBailiffs(tenant_id: string): Promise<Bailiff[]> {
  return BailiffService.getAll(tenant_id);
}

// Directorio platform-wide (alguaciles autorregistrados y activos), para
// elegir a quién transferir un expediente GOP — no depende del tenant que llama.
export async function getActiveBailiffsDirectory(): Promise<Bailiff[]> {
  return BailiffService.getAllActive();
}

export const getBailiffByUserId = async (
  user_id: string,
): Promise<{ success: boolean; data?: Bailiff; error?: string }> => {
  return BailiffService.getByUserId(user_id);
};
