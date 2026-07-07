"use server";
import { InterestType } from "@/modules/settings/services/interest-type.validators";
import { InterestTypeService } from "@/modules/settings/services/interest-type.service";

export async function getAllInterestTypes(): Promise<{
  interestTypes: InterestType[];
}> {
  const interestTypes = await InterestTypeService.getAll();
  return { interestTypes };
}

export async function getInterestTypeById(id: string): Promise<InterestType | null> {
  return InterestTypeService.getById(id);
}

export async function createInterestType(data: any) {
  return InterestTypeService.create(data);
}

export async function updateInterestType(id: string, data: any) {
  return InterestTypeService.update(id, data);
}

export async function deleteInterestType(id: string) {
  return InterestTypeService.delete(id);
}
