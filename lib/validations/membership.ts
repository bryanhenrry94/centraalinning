import { z } from "zod";

export const membershipSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  role: z.enum([
    "PLATFORM_OWNER",
    "TENANT_ADMIN",
    "AGENT",
    "DEBTOR",
    "BAILIFF",
  ]),
});

export const createMembershipSchema = membershipSchema.omit({ id: true });

export const updateMembershipSchema = membershipSchema
  .partial()
  .required({ id: true });

export type Membership = z.infer<typeof membershipSchema>;
export type CreateMembership = z.infer<typeof createMembershipSchema>;
export type UpdateMembership = z.infer<typeof updateMembershipSchema>;
