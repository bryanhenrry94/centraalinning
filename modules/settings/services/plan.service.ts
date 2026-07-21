import { prisma } from "@/lib/prisma";
import { Plan } from "@/modules/settings/services/plan.validators";

export class PlanService {
  static async getPlans(): Promise<Plan[]> {
    const plans = await prisma.plan.findMany({
      orderBy: { order: "asc" },
    });

    return plans.map((plan) => ({
      ...plan,
      registration_price: Number(plan.registration_price),
      monthly_price: Number(plan.monthly_price),
      yearly_price: Number(plan.yearly_price),
      reactivation_price: Number(plan.reactivation_price),
      features:
        typeof plan.features === "string"
          ? JSON.parse(plan.features)
          : plan.features,
    })) as Plan[];
  }
}
