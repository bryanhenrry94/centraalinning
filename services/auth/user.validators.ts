import { z } from "zod";
import { MembershipSchema } from "./membership.validators";

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().max(80).email(),
  password_hash: z.string().max(120).nullable().optional(),
  fullname: z.string().max(80).nullable().optional(),
  phone: z.string().max(25).nullable().optional(),
  is_active: z.boolean().optional(),
  created_at: z.date(),
  updated_at: z.date(),
});

export const UserResponseSchema = UserSchema.omit({
  password_hash: true,
}).extend({
  memberships: MembershipSchema.array(),
});
