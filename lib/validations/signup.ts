import { z } from "zod";

export const signUpSchema = z
  .object({
    fullname: z
      .string()
      .regex(/^\S.*\S$/, "Naam kan niet beginnen of eindigen met een spatie"),
    email: z
      .string()
      .nonempty("E-mail is verplicht")
      .email("Ongeldig e-mailformaat")
      .regex(/^\S.*\S$/, "E-mail kan niet beginnen of eindigen met een spatie"),
    password: z
      .string()
      .min(8, "Wachtwoord moet minstens 8 tekens lang zijn")
      .regex(
        /^\S.*\S$/,
        "Wachtwoord kan niet beginnen of eindigen met een spatie",
      ),
    confirm_password: z
      .string()
      .nonempty("Wachtwoord bevestigen is verplicht")
      .regex(
        /^\S.*\S$/,
        "Bevestigingswachtwoord kan niet beginnen of eindigen met een spatie",
      ),
    phone: z.string().optional(),
    kvk: z.string().nonempty("KVK is verplicht"),
    company_name: z.string().nonempty("Bedrijfsnaam is verplicht"),
    country: z.string().nonempty("Land is verplicht"),
    accept_terms: z.boolean().refine((val) => val === true, {
      message: "U moet de algemene voorwaarden accepteren",
    }),
  })
  .refine((data) => data.password === data.confirm_password, {
    path: ["confirm_password"],
    message: "Wachtwoorden moeten overeenkomen",
  });

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

const IdTokenSchema = z.object({
  id: z.string().uuid(),
  fullname: z.string(),
  email: z.string().email(),
  phone: z.string(),
  country: z.string(),
  identification_type: z.string(),
  identification: z.string(),
  tenant_id: z.string(),
  subdomain: z.string(),
  company: z.string(),
  role: z.string(),
  email_verified: z.boolean(),
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

export type iSignup = z.infer<typeof signUpSchema>;

export type iAuthUser = z.infer<typeof AuthUserSchema>;
export type iAuthUserResponse = z.infer<typeof AuthUsersResponseSchema>;
export type iAuthCompany = z.infer<typeof AuthCompanySchema>;
export type iAuthTenantSignUp = z.infer<typeof AuthSignUpSchema>;
export type iSubdomain = z.infer<typeof SubdomainSchema>;
export type iSignInTenant = z.infer<typeof AuthTenantSchema>;
export type iIdToken = z.infer<typeof IdTokenSchema>;
export type iResendVerificationEmail = z.infer<
  typeof ResendVerificationEmailSchema
>;
export type iEmailVerificationResponse = z.infer<
  typeof EmailVerificationResponseSchema
>;
export interface IUserToken {
  email: string;
  tenant_id: string;
  subdomain: string;
  role: string;
  id: string;
}

export interface IuserTokenInfos {
  exp: number;
  email: string;
  role: string;
  tenant_id: string;
  subdomain: string;
  type: string;
  sub: string;
}

export interface IUser {
  fullname: string;
  email: string;
  password: string;
  phone: string;
  country: string;
  identification_type: string;
  identification: string;
}

export interface ICompany {
  name: string;
  contact_email: string;
  kvk: string;
  address: string;
  country: string;
  number_of_employees: number;
  terms_accepted: boolean;
  role: string;
}

export interface ISubscription {
  subscription_type: string;
  subscription_price: number;
  price: number;
}

export interface ITenantSignUp {
  user: IUser;
  company: ICompany;
  subscription: ISubscription;
  total_price: number;
}

export const initialTenantSignUp: ITenantSignUp = {
  user: {
    fullname: "",
    email: "",
    password: "",
    phone: "",
    country: "BQ",
    identification_type: "",
    identification: "",
  },
  company: {
    name: "",
    contact_email: "",
    kvk: "",
    address: "",
    country: "",
    number_of_employees: 1,
    terms_accepted: false,
    role: "",
  },
  subscription: {
    price: 150,
    subscription_type: "",
    subscription_price: 0,
  },
  total_price: 0,
};

export interface iValidateSlugResponse {
  subdomain: string;
  is_valid: boolean;
}
