import { getServerSession, Session } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@/shared/constants/user-role";

const TENANT_STAFF_ROLES: UserRole[] = [
  UserRole.TENANT_ADMIN,
  UserRole.AGENT,
  UserRole.EMPLOYEE,
];

async function getSessionOrThrow(): Promise<Session> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error("U bent niet ingelogd.");
  }
  return session;
}

const isPlatformOwner = (session: Session) =>
  !!session.user.roles?.includes(UserRole.PLATFORM_OWNER);

const isTenantStaff = (session: Session) =>
  !!session.user.roles?.some((role) => (TENANT_STAFF_ROLES as string[]).includes(role));

// El expediente digital centralizado lo pueden ver: el staff del tenant
// dueño del dossier, y el abogado/alguacil actualmente asignados (si los
// hay) — las mismas partes que ya tienen acceso a las piezas individuales
// que este servicio reúne.
export async function requireAuthorizedForCaseFile(debtClaimId: string) {
  const session = await getSessionOrThrow();

  const debtClaim = await prisma.debtClaim.findUnique({
    where: { id: debtClaimId },
    include: {
      caseTransfers: { include: { lawyer: true, bailiff: true } },
      legalProcess: { include: { bailiff: true } },
    },
  });
  if (!debtClaim) throw new Error("Dossier niet gevonden.");

  if (isPlatformOwner(session)) return { session, debtClaim };

  const isStaffOfTenant = isTenantStaff(session) && session.user.tenant_id === debtClaim.tenantId;
  const isAssignedProfessional =
    debtClaim.caseTransfers.some(
      (t) => t.lawyer?.userId === session.user.id || t.bailiff?.user_id === session.user.id,
    ) || debtClaim.legalProcess?.bailiff?.user_id === session.user.id;

  if (!isStaffOfTenant && !isAssignedProfessional) {
    throw new Error("U heeft geen toegang tot dit dossier.");
  }

  return { session, debtClaim };
}
