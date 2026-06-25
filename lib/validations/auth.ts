import { z } from "zod";
import { membershipSchema } from "./membership";

export const IdTokenSchema = z.object({
  id: z.string(),
  code: z.string(),
  fullname: z.string(),
  email: z.string().email(),
  phone: z.string(),
  tenant_id: z.string(),
  subdomain: z.string(),
  company: z.string(),
  roles: z.array(z.string()),
  email_verified: z.boolean(),
  memberships: membershipSchema.array(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const EmailSchema = z.object({
  email: z.string().email(),
});

export type IdTokenInput = z.infer<typeof IdTokenSchema>;
export type LoginFormData = z.infer<typeof loginSchema>;
export type EmailFormData = z.infer<typeof EmailSchema>;
