import { getServerSession, Session } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@/shared/constants/user-role";

// Roles que representan al "participante" (cliente/acreedor) dentro de un
// tenant, en oposición a DEBTOR, BAILIFF y LAWYER que son partes externas
// del expediente GOP con acceso limitado a lo que se les asigna.
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

// Transferir, cambiar de alguacil y cancelar el GOP son decisiones que solo
// puede tomar el participante (secciones 1, 13 y 14 del proceso GOP).
export async function requireTenantStaffForTenant(tenantId: string) {
  const session = await getSessionOrThrow();
  if (isPlatformOwner(session)) return session;

  if (!isTenantStaff(session) || session.user.tenant_id !== tenantId) {
    throw new Error("Alleen medewerkers van deze organisatie kunnen deze actie uitvoeren.");
  }
  return session;
}

export async function requireTenantStaffForDebtClaim(debtClaimId: string) {
  const debtClaim = await prisma.debtClaim.findUnique({ where: { id: debtClaimId } });
  if (!debtClaim) throw new Error("Dossier niet gevonden.");

  const session = await requireTenantStaffForTenant(debtClaim.tenantId);
  return { session, debtClaim };
}

export async function requireTenantStaffForLegalProcess(legalProcessId: string) {
  const legalProcess = await prisma.legalProcess.findUnique({
    where: { id: legalProcessId },
    include: { debtClaim: true },
  });
  if (!legalProcess) throw new Error("Dossier niet gevonden.");

  const session = await requireTenantStaffForTenant(legalProcess.debtClaim.tenantId);
  return { session, legalProcess };
}

// Aceptar/rechazar una transferencia es, por definición, una decisión de la
// parte asignada (abogado O alguacil, según cuál se haya elegido al
// transferir — nunca ambos) — si el participante pudiera auto-aprobarla, el
// paso de aceptación del spec (sección 2) no tendría ningún efecto.
export async function requireAssignedLawyerOrBailiff(legalProcessId: string) {
  const session = await getSessionOrThrow();

  const legalProcess = await prisma.legalProcess.findUnique({
    where: { id: legalProcessId },
    include: { lawyer: true, bailiff: true, debtClaim: true },
  });
  if (!legalProcess) throw new Error("Dossier niet gevonden.");

  if (isPlatformOwner(session)) return { session, legalProcess };

  const isAssignedLawyer = legalProcess.lawyer?.userId === session.user.id;
  const isAssignedBailiff = legalProcess.bailiff?.user_id === session.user.id;

  if (!isAssignedLawyer && !isAssignedBailiff) {
    throw new Error("Alleen de toegewezen advocaat of deurwaarder kan deze actie uitvoeren.");
  }
  return { session, legalProcess };
}

// La gestión operativa del GOP (sentencia, medidas de ejecución, intereses,
// costos, inactivo/reactivación, cierre) la hace el alguacil asignado, pero
// hoy el back-office del participante también puede registrarla en su
// nombre porque el portal de autoservicio del alguacil aún no está en
// producción (ver plan GOP, Fase 7).
export async function requireStaffOrAssignedBailiff(legalProcessId: string) {
  const session = await getSessionOrThrow();

  const legalProcess = await prisma.legalProcess.findUnique({
    where: { id: legalProcessId },
    include: { debtClaim: true, bailiff: true },
  });
  if (!legalProcess) throw new Error("Dossier niet gevonden.");

  if (isPlatformOwner(session)) return { session, legalProcess };

  const isStaffOfTenant =
    isTenantStaff(session) && session.user.tenant_id === legalProcess.debtClaim.tenantId;
  const isAssignedBailiff = legalProcess.bailiff?.user_id === session.user.id;

  if (!isStaffOfTenant && !isAssignedBailiff) {
    throw new Error(
      "Alleen de toegewezen deurwaarder of medewerkers van deze organisatie kunnen deze actie uitvoeren.",
    );
  }
  return { session, legalProcess };
}

export async function requireStaffOrAssignedBailiffForVerdict(verdictId: string) {
  const verdict = await prisma.verdict.findUnique({
    where: { id: verdictId },
    select: { legal_process_id: true },
  });
  if (!verdict) throw new Error("Vonnis niet gevonden.");

  return requireStaffOrAssignedBailiff(verdict.legal_process_id);
}
