import { getServerSession, Session } from "next-auth";
import { authOptions } from "@/lib/auth";
import { UserRole } from "@/shared/constants/user-role";

async function getSessionOrThrow(): Promise<Session> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.tenant_id) {
    throw new Error("U bent niet ingelogd.");
  }
  return session;
}

const isPlatformOwner = (session: Session) =>
  !!session.user.roles?.includes(UserRole.PLATFORM_OWNER);

// Bedrijfsregistratiegegevens (naam, contactgegevens) zijn gevoelig genoeg
// om te beperken tot de organisatiebeheerder — niet elke medewerker met
// toegang tot /settings mag ze wijzigen.
export async function requireTenantAdminForTenant(tenantId: string) {
  const session = await getSessionOrThrow();
  if (isPlatformOwner(session)) return session;

  const isTenantAdmin = !!session.user.roles?.includes(UserRole.TENANT_ADMIN);
  if (!isTenantAdmin || session.user.tenant_id !== tenantId) {
    throw new Error(
      "Alleen de organisatiebeheerder kan deze gegevens wijzigen.",
    );
  }
  return session;
}
