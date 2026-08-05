import { getServerSession, Session } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@/shared/constants/user-role";

// Roles que representan al "participante" (cliente/acreedor) dentro de un
// tenant, en oposición a DEBTOR, BAILIFF y LAWYER que son partes externas.
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

export async function requireTenantStaffForDebtClaim(debtClaimId: string) {
  const debtClaim = await prisma.debtClaim.findUnique({ where: { id: debtClaimId } });
  if (!debtClaim) throw new Error("Dossier niet gevonden.");

  const session = await getSessionOrThrow();
  if (isPlatformOwner(session)) return { session, debtClaim };

  if (!isTenantStaff(session) || session.user.tenant_id !== debtClaim.tenantId) {
    throw new Error("Alleen medewerkers van deze organisatie kunnen deze actie uitvoeren.");
  }
  return { session, debtClaim };
}

export async function requireTenantStaffForCaseTransfer(caseTransferId: string) {
  const caseTransfer = await prisma.caseTransfer.findUnique({
    where: { id: caseTransferId },
    include: { debtClaim: true },
  });
  if (!caseTransfer) throw new Error("Dossier niet gevonden.");

  const session = await getSessionOrThrow();
  if (isPlatformOwner(session)) return { session, caseTransfer };

  if (!isTenantStaff(session) || session.user.tenant_id !== caseTransfer.debtClaim.tenantId) {
    throw new Error("Alleen medewerkers van deze organisatie kunnen deze actie uitvoeren.");
  }
  return { session, caseTransfer };
}

// Aceptar/rechazar una transferencia es, por definición, una decisión de la
// parte asignada (abogado O alguacil, según cuál se haya elegido al
// transferir — nunca ambos).
export async function requireAssignedLawyerOrBailiff(caseTransferId: string) {
  const session = await getSessionOrThrow();

  const caseTransfer = await prisma.caseTransfer.findUnique({
    where: { id: caseTransferId },
    include: { lawyer: true, bailiff: true, debtClaim: true },
  });
  if (!caseTransfer) throw new Error("Dossier niet gevonden.");

  if (isPlatformOwner(session)) return { session, caseTransfer };

  const isAssignedLawyer = caseTransfer.lawyer?.userId === session.user.id;
  const isAssignedBailiff = caseTransfer.bailiff?.user_id === session.user.id;

  if (!isAssignedLawyer && !isAssignedBailiff) {
    throw new Error("Alleen de toegewezen advocaat of deurwaarder kan deze actie uitvoeren.");
  }
  return { session, caseTransfer };
}

// Finalizar el trabajo del abogado (factura + pago CFSB) y transferir la
// sentencia al alguacil son actos exclusivos del abogado asignado.
export async function requireAssignedLawyer(caseTransferId: string) {
  const session = await getSessionOrThrow();

  const caseTransfer = await prisma.caseTransfer.findUnique({
    where: { id: caseTransferId },
    include: { debtClaim: true, lawyer: true },
  });
  if (!caseTransfer) throw new Error("Dossier niet gevonden.");

  if (isPlatformOwner(session)) return { session, caseTransfer };

  const isAssignedLawyer = caseTransfer.lawyer?.userId === session.user.id;
  if (!isAssignedLawyer) {
    throw new Error("Alleen de toegewezen advocaat kan deze actie uitvoeren.");
  }
  return { session, caseTransfer };
}

// Registrar el vonnis (primera sentencia, la que crea el LegalProcess) es un
// acto exclusivo del alguacil asignado a la transferencia.
export async function requireAssignedBailiffForTransfer(caseTransferId: string) {
  const session = await getSessionOrThrow();

  const caseTransfer = await prisma.caseTransfer.findUnique({
    where: { id: caseTransferId },
    include: { debtClaim: true, bailiff: true },
  });
  if (!caseTransfer) throw new Error("Dossier niet gevonden.");

  if (isPlatformOwner(session)) return { session, caseTransfer };

  const isAssignedBailiff = caseTransfer.bailiff?.user_id === session.user.id;
  if (!isAssignedBailiff) {
    throw new Error("Alleen de toegewezen deurwaarder kan een vonnis registreren.");
  }
  return { session, caseTransfer };
}

// Registrar una propuesta de acuerdo de pago: el participante, o el
// abogado/alguacil asignado (sin necesidad de volmacht — proponer siempre
// está permitido, decidir es lo que requiere autorización).
export async function requireStaffOrAssignedLawyerOrBailiffForAgreementProposal(
  caseTransferId: string,
) {
  return requireStaffOrAssignedLawyerOrBailiffForTransfer(caseTransferId);
}

// Decidir (aceptar, modificar o rechazar) un acuerdo de pago del GOP: el
// participante siempre puede; el abogado/alguacil asignado solo si el
// CaseTransfer tiene power of attorney otorgado — esa última condición la
// valida AgreementService.decide, acá solo se resuelve QUIÉN es el actor.
export async function requireAuthorizedToDecideCaseTransferAgreement(caseTransferId: string) {
  const session = await getSessionOrThrow();

  const caseTransfer = await prisma.caseTransfer.findUnique({
    where: { id: caseTransferId },
    include: { debtClaim: true, lawyer: true, bailiff: true },
  });
  if (!caseTransfer) throw new Error("Dossier niet gevonden.");

  if (isPlatformOwner(session)) {
    return { session, caseTransfer, isTenantStaff: true, isAssignedProfessional: false };
  }

  const isStaffOfTenant =
    isTenantStaff(session) && session.user.tenant_id === caseTransfer.debtClaim.tenantId;
  const isAssignedProfessional =
    caseTransfer.lawyer?.userId === session.user.id ||
    caseTransfer.bailiff?.user_id === session.user.id;

  if (!isStaffOfTenant && !isAssignedProfessional) {
    throw new Error(
      "Alleen de deelnemer of de toegewezen advocaat/deurwaarder (met volmacht) kan hierover beslissen.",
    );
  }

  return { session, caseTransfer, isTenantStaff: isStaffOfTenant, isAssignedProfessional };
}

// Ver/descargar documentos, además del staff, lo necesitan el abogado o
// alguacil asignados.
export async function requireStaffOrAssignedLawyerOrBailiffForTransfer(caseTransferId: string) {
  const session = await getSessionOrThrow();

  const caseTransfer = await prisma.caseTransfer.findUnique({
    where: { id: caseTransferId },
    include: { debtClaim: true, lawyer: true, bailiff: true },
  });
  if (!caseTransfer) throw new Error("Dossier niet gevonden.");

  if (isPlatformOwner(session)) return { session, caseTransfer };

  const isStaffOfTenant =
    isTenantStaff(session) && session.user.tenant_id === caseTransfer.debtClaim.tenantId;
  const isAssignedLawyer = caseTransfer.lawyer?.userId === session.user.id;
  const isAssignedBailiff = caseTransfer.bailiff?.user_id === session.user.id;

  if (!isStaffOfTenant && !isAssignedLawyer && !isAssignedBailiff) {
    throw new Error(
      "Alleen de toegewezen advocaat, deurwaarder of medewerkers van deze organisatie kunnen deze actie uitvoeren.",
    );
  }
  return { session, caseTransfer };
}
