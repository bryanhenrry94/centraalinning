"use server";
import {
  Lawyer,
  LawyerUpdate,
} from "@/modules/lawyer/services/lawyer.validators";
import { LawyerService } from "@/modules/lawyer/services/lawyer.service";

export async function getLawyerById(
  id: string,
): Promise<{ success: boolean; data?: Lawyer; error?: string }> {
  return LawyerService.getById(id);
}

export async function updateLawyer(
  id: string,
  data: Partial<LawyerUpdate>,
): Promise<{ success: boolean; data?: Lawyer; error?: string }> {
  return LawyerService.update(id, data);
}

export async function getAllLawyers(tenant_id: string): Promise<Lawyer[]> {
  return LawyerService.getAll(tenant_id);
}

// Directorio platform-wide (abogados autorregistrados y activos), para
// elegir a quién transferir un expediente GOP — no depende del tenant que llama.
export async function getActiveLawyersDirectory(): Promise<Lawyer[]> {
  return LawyerService.getAllActive();
}

export const getLawyerByUserId = async (
  user_id: string,
): Promise<{ success: boolean; data?: Lawyer; error?: string }> => {
  return LawyerService.getByUserId(user_id);
};
