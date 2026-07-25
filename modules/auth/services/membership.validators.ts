import { z } from "zod";

export const MembershipSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  tenantName: z.string(),
  tenantCode: z.string().optional(),
  subdomain: z.string(),
  status: z.string(),
  roles: z.array(z.string()),
});

export const MembershipCreateSchema = MembershipSchema.omit({ id: true });

export const MembershipUpdateSchema = MembershipSchema.partial().required({
  id: true,
});

// Type exports (aliases for compatibility)
export type Membership = z.infer<typeof MembershipSchema>;
export type MembershipCreate = z.infer<typeof MembershipCreateSchema>;
export type MembershipUpdate = z.infer<typeof MembershipUpdateSchema>;
// Lowercase alias for legacy code
export const membershipSchema = MembershipSchema;
