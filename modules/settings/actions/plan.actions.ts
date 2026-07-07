"use server";
import { Plan } from "@/modules/settings/services/plan.validators";
import { PlanService } from "@/modules/settings/services/plan.service";

export const getPlans = async (): Promise<Plan[]> => {
  return PlanService.getPlans();
};
