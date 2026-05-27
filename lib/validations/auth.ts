import { z } from "zod";

export const IdTokenSchema = z.object({
  id: z.uuid(),
  fullname: z.string(),
  email: z.email(),
  phone: z.string(),
  tenant_id: z.string(),
  subdomain: z.string(),
  company: z.string(),
  role: z.string(),
  email_verified: z.boolean(),
});

export const loginSchema = z.object({
  email: z.email(),
  password: z.string(),
});

export const EmailSchema = z.object({
  email: z.string().email(),
});

export type IdTokenInput = z.infer<typeof IdTokenSchema>;
export type LoginFormData = z.infer<typeof loginSchema>;
export type EmailFormData = z.infer<typeof EmailSchema>;
