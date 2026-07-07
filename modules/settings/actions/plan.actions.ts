"use server";
import { prisma } from "@/lib/prisma";
import { Plan } from "@/modules/settings/services/plan.validators";

export const getPlans = async (): Promise<Plan[]> => {
  const plans = await prisma.plan.findMany();

  const formattedPlans = plans.map((plan) => ({
    ...plan,
    monthly_price: Number(plan.monthly_price),
    yearly_price: Number(plan.yearly_price),
    reactivation_price: Number(plan.reactivation_price),
    features:
      typeof plan.features === "string"
        ? JSON.parse(plan.features)
        : plan.features,
  }));

  return formattedPlans as Plan[];
};
