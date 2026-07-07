import { z } from "zod";

export const MembershipSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  tenantName: z.string(),
  subdomain: z.string(),
  status: z.string(),
  roles: z.array(z.string()),
});

export const MembershipCreateSchema = MembershipSchema.omit({ id: true });

export const MembershipUpdateSchema = MembershipSchema.partial().required({
  id: true,
});
