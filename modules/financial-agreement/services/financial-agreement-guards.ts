import { getServerSession, Session } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@/shared/constants/user-role";

// FAR lo gestiona exclusivamente el participante (deelnemer) — no hay
// abogado, alguacil ni deudor involucrados en este servicio.
const TENANT_STAFF_ROLES: UserRole[] = [
  UserRole.TENANT_ADMIN,
  UserRole.AGENT,
  UserRole.EMPLOYEE,
];

async function getSessionOrThrow(): Promise<Session> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.tenant_id) {
    throw new Error("U bent niet ingelogd.");
  }
  return session;
}

const isPlatformOwner = (session: Session) =>
  !!session.user.roles?.includes(UserRole.PLATFORM_OWNER);

const isTenantStaff = (session: Session) =>
  !!session.user.roles?.some((role) => (TENANT_STAFF_ROLES as string[]).includes(role));

export async function requireTenantStaffForTenant(tenantId: string) {
  const session = await getSessionOrThrow();
  if (isPlatformOwner(session)) return session;

  if (!isTenantStaff(session) || session.user.tenant_id !== tenantId) {
    throw new Error("Alleen medewerkers van deze organisatie kunnen deze actie uitvoeren.");
  }
  return session;
}

export async function requireTenantStaffForFinancialAgreement(financialAgreementId: string) {
  const financialAgreement = await prisma.financialAgreement.findUnique({
    where: { id: financialAgreementId },
  });
  if (!financialAgreement) throw new Error("Financiële afspraak niet gevonden.");

  const session = await getSessionOrThrow();
  if (isPlatformOwner(session)) return { session, financialAgreement };

  if (!isTenantStaff(session) || session.user.tenant_id !== financialAgreement.tenantId) {
    throw new Error("Alleen medewerkers van deze organisatie kunnen deze actie uitvoeren.");
  }
  return { session, financialAgreement };
}
