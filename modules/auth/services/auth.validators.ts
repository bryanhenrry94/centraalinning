import { membershipSchema } from "@/modules/auth/services/membership.validators";
import { z } from "zod";

export const companyInfoSchema = z.object({
  name: z
    .string()
    .min(2, "Bedrijfsnaam moet minimaal 2 tekens lang zijn")
    .regex(
      /^[a-zA-Z0-9]+([a-zA-Z0-9- ]*[a-zA-Z0-9])?$/,
      "Bedrijfsnaam mag alleen letters, cijfers, koppeltekens en spaties bevatten, en mag niet beginnen of eindigen met een spatie",
    ),
  contact_email: z
    .string()
    .nonempty("E-mailadres is verplicht")
    .email("Ongeldig e-mailadres"),
  kvk: z.string().nonempty("KVK-nummer is verplicht"), // No additional validation specified for kvk
  country: z.string().nonempty("Land is verplicht"),
  address: z.string().nonempty("Adres is verplicht"),
  number_of_employees: z.number().min(1, "Aantal werknemers is verplicht"),
});

const SubdomainSchema = z.object({
  subdomain: z.string().max(50),
});

const AuthTenantSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  subdomain: z.string(),
});

const AuthUserSchema = z.object({
  fullname: z.string(),
  email: z.string().email(),
  password: z.string(),
  phone: z.string(),
  country: z.string(),
  identification_type: z.string(),
  identification: z.string(),
});

const AuthUsersResponseSchema = AuthUserSchema.omit({ password: true });

const AuthCompanySchema = z.object({
  name: z.string(),
  contact_email: z.string().email(),
  kvk: z.string(),
  address: z.string(),
  country: z.string(),
  number_of_employees: z.number().min(1).optional(),
  terms_accepted: z.boolean(),
});

const AuthSignUpSchema = z.object({
  user: AuthUserSchema,
  company: AuthCompanySchema,
});

const ResendVerificationEmailSchema = z.object({
  user_id: z.string(),
});

const EmailVerificationResponseSchema = z.object({
  sub: z.string().uuid(),
  fullname: z.string(),
  email: z.string().email(),
  phone: z.string(),
  country: z.string(),
  identification_type: z.string(),
  identification: z.string(),
  tenant_id: z.string(),
  subdomain: z.string(),
  role: z.string(),
  email_verified: z.boolean(),
});

const IdTokenSchema = z.object({
  id: z.string(),
  code: z.string().optional(),
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

// const IdTokenSchema = z.object({
//   id: z.string().uuid(),
//   fullname: z.string(),
//   email: z.string().email(),
//   phone: z.string(),
//   country: z.string(),
//   identification_type: z.string(),
//   identification: z.string(),
//   tenant_id: z.string(),
//   subdomain: z.string(),
//   company: z.string(),
//   role: z.string(),
//   email_verified: z.boolean(),
// });

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const EmailSchema = z.object({
  email: z.string().email(),
});

export {
  AuthUserSchema,
  AuthCompanySchema,
  AuthSignUpSchema,
  AuthUsersResponseSchema,
  SubdomainSchema,
  AuthTenantSchema,
  IdTokenSchema,
  ResendVerificationEmailSchema,
  EmailVerificationResponseSchema,
};

// Type exports for backwards compatibility
export type LoginFormData = z.infer<typeof loginSchema>;
export type IdTokenInput = z.infer<typeof IdTokenSchema>;
export type EmailFormData = z.infer<typeof EmailSchema>;
