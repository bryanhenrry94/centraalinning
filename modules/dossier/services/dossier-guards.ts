import { getServerSession, Session } from "next-auth";
import { authOptions } from "@/lib/auth";
import { UserRole } from "@/shared/constants/user-role";

// Zelfde doelgroep als de vaste "Diensten"-knop (canAccessWorkstation in
// header.tsx) — "Mijn dossiers" is het navigatie-tegenhanger van diezelfde
// 6 diensten, dus geen reden om hier een smallere rolset te hanteren.
const ALLOWED_ROLES: UserRole[] = [
  UserRole.TENANT_ADMIN,
  UserRole.AGENT,
  UserRole.EMPLOYEE,
  UserRole.BANK,
];

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
