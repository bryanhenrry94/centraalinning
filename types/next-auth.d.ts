import { Membership } from "@/lib/validations/membership";
import { UserRole } from "@/constants/user-role";

declare module "next-auth/jwt" {
  interface JWT {
    id: string;

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
