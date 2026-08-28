import { getServerSession, Session } from "next-auth";
import { authOptions } from "@/lib/auth";
import { UserRole } from "@/shared/constants/user-role";

// Único guard de acceso para todas las pantallas/acciones de CFSB Admin —
// mismo patrón que requireTenantStaffForCaseTransfer en
// modules/legal-process/services/case-transfer-guards.ts, pero sin
// alternativa de staff de tenant: estas pantallas son cross-tenant, así que
// solo PLATFORM_OWNER puede entrar.
export async function requirePlatformOwner(): Promise<Session> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error("U bent niet ingelogd.");
  }
  if (!session.user.roles?.includes(UserRole.PLATFORM_OWNER)) {
    throw new Error("Alleen CFSB-beheerders kunnen deze pagina openen.");
  }
  return session;
}
