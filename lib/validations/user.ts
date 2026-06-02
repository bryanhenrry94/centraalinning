import { z } from "zod";
import { membershipSchema } from "./membership";

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().max(80).email(),
  password_hash: z.string().max(120).nullable().optional(),
  fullname: z.string().max(80).nullable().optional(),
  phone: z.string().max(25).nullable().optional(),
  is_active: z.boolean().optional(),
  memberships: membershipSchema.array(),
  created_at: z.date(),
  updated_at: z.date(),
});

export const UserStatusSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE", "PENDING", "EXPIRED", "CANCELLED"]),
});

export type User = z.infer<typeof UserSchema>;
