import { Membership } from "@/modules/auth/services/membership.validators";
import { UserRole } from "@/shared/constants/user-role";

declare module "next-auth/jwt" {
  interface JWT {
    id: string;

    code?: string;

    fullname: string;

    email: string;

    phone: string;

    tenant_id: string;

    subdomain: string;

    company: string;

    roles: UserRole[];

    email_verified: boolean;

    memberships: Membership[];
  }
}
