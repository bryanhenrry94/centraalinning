import { prisma } from "@/lib/prisma";
import { Plan, PlanUpdate } from "@/modules/settings/services/plan.validators";

export class PlanService {
  // Edición desde CFSB Admin (Plannen > Plan bewerken). No existía ningún
  // método de escritura sobre Plan hasta ahora — los planes solo se leían
  // para el selector de signup (plan-step.tsx).
  static async update(id: string, data: Partial<PlanUpdate>): Promise<Plan> {
    const plan = await prisma.plan.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.registration_price !== undefined && { registration_price: data.registration_price }),
        ...(data.monthly_price !== undefined && { monthly_price: data.monthly_price }),
        ...(data.yearly_price !== undefined && { yearly_price: data.yearly_price }),
        ...(data.reactivation_price !== undefined && { reactivation_price: data.reactivation_price }),
        ...(data.order !== undefined && { order: data.order }),
        ...(data.features !== undefined && { features: data.features }),
      },
    });
    return {
      ...plan,
      registration_price: Number(plan.registration_price),
      monthly_price: Number(plan.monthly_price),
      yearly_price: Number(plan.yearly_price),
      reactivation_price: Number(plan.reactivation_price),
      features:
        typeof plan.features === "string" ? JSON.parse(plan.features) : plan.features,
    } as Plan;
  }

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
