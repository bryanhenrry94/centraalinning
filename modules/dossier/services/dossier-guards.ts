import { getServerSession, Session } from "next-auth";
import { authOptions } from "@/lib/auth";
import { UserRole } from "@/shared/constants/user-role";

// Zelfde rol als de "dossiers"-menugroep in shared/ui/layout/menus.tsx
// (TENANT_ADMIN) — geen uitbreiding naar AGENT/EMPLOYEE/BANK als bijeffect
// van dit scherm.
const ALLOWED_ROLES: UserRole[] = [UserRole.TENANT_ADMIN];

export async function requireTenantStaff(): Promise<Session> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenant_id) {
    throw new Error("U bent niet ingelogd.");
  }
  const hasAllowedRole = session.user.roles?.some((role) =>
    (ALLOWED_ROLES as string[]).includes(role),
  );
  if (!hasAllowedRole) {
    throw new Error("U heeft geen toegang tot dit overzicht.");
  }
  return session;
}
