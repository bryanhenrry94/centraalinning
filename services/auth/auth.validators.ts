import { membershipSchema } from "@/lib/validations/membership";
import { z } from "zod";

export const companyInfoSchema = z.object({
  name: z
    .string()
    .min(2, "Company name must be at least 2 characters long")
    .regex(
      /^[a-zA-Z0-9]+([a-zA-Z0-9- ]*[a-zA-Z0-9])?$/,
      "Company name can only contain letters, numbers, hyphens, and spaces, and cannot start or end with a space",
    ),
  contact_email: z
    .string()
    .nonempty("Contact email is required")
    .email("Invalid email format"),
  kvk: z.string().nonempty("Kvk code is required"), // No additional validation specified for kvk
  country: z.string().nonempty("Country is required"),
  address: z.string().nonempty("Address is required"),
  number_of_employees: z.number().min(1, "Number of employees is required"),
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
