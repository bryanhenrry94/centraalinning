import { z } from "zod";

export const membershipSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  tenantName: z.string(),
  subdomain: z.string(),
  status: z.string(),
  roles: z.array(z.string()),
});

export const createMembershipSchema = membershipSchema.omit({ id: true });

export const updateMembershipSchema = membershipSchema
  .partial()
  .required({ id: true });

export type Membership = z.infer<typeof membershipSchema>;
export type CreateMembership = z.infer<typeof createMembershipSchema>;
export type UpdateMembership = z.infer<typeof updateMembershipSchema>;
