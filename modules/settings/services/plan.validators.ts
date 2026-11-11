import { z } from "zod";
import { UserRole } from "@/shared/constants/user-role";

export const planSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  // Rol de cuenta que otorga este plan (Deelnemer/Advocaat/Deurwaarder/Bank)
  // — usado para filtrar los planes por tipo de registro elegido (ver
  // RegistrationTypeStep/PlanStep en modules/auth/components/signup).
  target_role: z.nativeEnum(UserRole),
  registration_price: z.preprocess(
    (val) => (typeof val === "string" ? Number(val) : val),
    z.number(),
  ),
  monthly_price: z.preprocess(
    (val) => (typeof val === "string" ? Number(val) : val),
    z.number(),
  ),
  yearly_price: z.preprocess(
    (val) => (typeof val === "string" ? Number(val) : val),
    z.number(),
  ),
  features: z.record(z.string(), z.any()),
  reactivation_price: z.preprocess(
    (val) => (typeof val === "string" ? Number(val) : val),
    z.number(),
  ),
  order: z.preprocess(
    (val) => (typeof val === "string" ? Number(val) : val),
    z.number(),
  ),
  created_at: z.date(),
  updated_at: z.date(),
});

// Schema for creating a Plan (id, created_at, updated_at are omitted because they're generated)
export const planCreateSchema = planSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

// Schema for updating a Plan (all fields optional)
export const planUpdateSchema = planCreateSchema.partial();

export type Plan = z.infer<typeof planSchema>;
export type PlanUpdate = z.infer<typeof planUpdateSchema>;
