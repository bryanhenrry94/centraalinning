import { z } from "zod";

import {
  AuthUserSchema,
  AuthCompanySchema,
  AuthSignUpSchema,
  AuthUsersResponseSchema,
  SubdomainSchema,
  AuthTenantSchema,
  IdTokenSchema,
  ResendVerificationEmailSchema,
  EmailVerificationResponseSchema,
} from "./auth.validators";

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
