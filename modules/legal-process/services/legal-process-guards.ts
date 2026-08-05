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

// Cambiar de alguacil es una decisión que solo puede tomar el participante.
export async function requireTenantStaffForTenant(tenantId: string) {
  const session = await getSessionOrThrow();
  if (isPlatformOwner(session)) return session;

  if (!isTenantStaff(session) || session.user.tenant_id !== tenantId) {
    throw new Error("Alleen medewerkers van deze organisatie kunnen deze actie uitvoeren.");
  }
  return session;
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

// La gestión operativa del GOP (sentencia, medidas de ejecución, intereses,
// costos, inactivo/reactivación, cierre) la hace el alguacil asignado, pero
// hoy el back-office del participante también puede registrarla en su
// nombre porque el portal de autoservicio del alguacil aún no está en
// producción.
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

// Registrar una sentencia ADICIONAL sobre un GOP ya activo es un acto
// exclusivo del alguacil asignado — sin fallback de back-office.
export async function requireAssignedBailiff(legalProcessId: string) {
  const session = await getSessionOrThrow();

  const legalProcess = await prisma.legalProcess.findUnique({
    where: { id: legalProcessId },
    include: { debtClaim: true, bailiff: true },
  });
  if (!legalProcess) throw new Error("Dossier niet gevonden.");

  if (isPlatformOwner(session)) return { session, legalProcess };

  const isAssignedBailiff = legalProcess.bailiff?.user_id === session.user.id;
  if (!isAssignedBailiff) {
    throw new Error("Alleen de toegewezen deurwaarder kan een vonnis registreren.");
  }
  return { session, legalProcess };
}

// Ver/descargar documentos del expediente post-vonnis: staff del tenant o
// el alguacil asignado.
export async function requireStaffOrAssignedBailiffForDocuments(legalProcessId: string) {
  return requireStaffOrAssignedBailiff(legalProcessId);
}

// Decidir (aceptar, modificar o rechazar) un acuerdo de pago post-vonnis:
// el participante siempre puede; el alguacil asignado solo si el
// CaseTransfer de origen tiene power of attorney otorgado — esa condición
// la valida AgreementService.decide, acá solo se resuelve QUIÉN es el actor.
export async function requireAuthorizedToDecideGopAgreement(legalProcessId: string) {
  const session = await getSessionOrThrow();

  const legalProcess = await prisma.legalProcess.findUnique({
    where: { id: legalProcessId },
    include: { debtClaim: true, bailiff: true, caseTransfer: true },
  });
  if (!legalProcess) throw new Error("Dossier niet gevonden.");

  if (isPlatformOwner(session)) {
    return {
      session,
      legalProcess,
      isTenantStaff: true,
      isAssignedProfessional: false,
      hasPowerOfAttorney: legalProcess.caseTransfer.hasPowerOfAttorney,
    };
  }

  const isStaffOfTenant =
    isTenantStaff(session) && session.user.tenant_id === legalProcess.debtClaim.tenantId;
  const isAssignedProfessional = legalProcess.bailiff?.user_id === session.user.id;

  if (!isStaffOfTenant && !isAssignedProfessional) {
    throw new Error(
      "Alleen de deelnemer of de toegewezen deurwaarder (met volmacht) kan hierover beslissen.",
    );
  }

  return {
    session,
    legalProcess,
    isTenantStaff: isStaffOfTenant,
    isAssignedProfessional,
    hasPowerOfAttorney: legalProcess.caseTransfer.hasPowerOfAttorney,
  };
}

export async function requireStaffOrAssignedBailiffForVerdict(verdictId: string) {
  const verdict = await prisma.verdict.findUnique({
    where: { id: verdictId },
    select: { legal_process_id: true },
  });
  if (!verdict) throw new Error("Vonnis niet gevonden.");

  return requireStaffOrAssignedBailiff(verdict.legal_process_id);
}

// Confirmar o disputar un pago del GOP es exclusivo de la CONTRAPARTE de
// quien lo registró: si lo recibió el alguacil, confirma el participante;
// si lo recibió el participante, confirma el alguacil asignado. Ninguna de
// las dos partes puede confirmar su propio registro.
export async function requireAuthorizedToConfirmGopPayment(confirmationId: string) {
  const session = await getSessionOrThrow();

  const confirmation = await prisma.gopPaymentConfirmation.findUnique({
    where: { id: confirmationId },
    include: { legalProcess: { include: { debtClaim: true, bailiff: true } } },
  });
  if (!confirmation) throw new Error("Betalingsregistratie niet gevonden.");

  const legalProcess = confirmation.legalProcess;

  if (isPlatformOwner(session)) return { session, confirmation };

  const isStaffOfTenant =
    isTenantStaff(session) && session.user.tenant_id === legalProcess.debtClaim.tenantId;
  const isAssignedBailiff = legalProcess.bailiff?.user_id === session.user.id;

  const isAuthorized = confirmation.receivedBy === "BAILIFF" ? isStaffOfTenant : isAssignedBailiff;

  if (!isAuthorized) {
    throw new Error(
      confirmation.receivedBy === "BAILIFF"
        ? "Alleen de deelnemer kan deze betaling bevestigen of betwisten."
        : "Alleen de toegewezen deurwaarder kan deze betaling bevestigen of betwisten.",
    );
  }

  return { session, confirmation };
}

// Corregir tras una disputa es exclusivo de quien registró originalmente
// el pago (verificado también, de forma definitiva, en el Service).
export async function requireAuthorizedToCorrectGopPayment(confirmationId: string) {
  const session = await getSessionOrThrow();

  const confirmation = await prisma.gopPaymentConfirmation.findUnique({
    where: { id: confirmationId },
    include: { legalProcess: { include: { debtClaim: true } } },
  });
  if (!confirmation) throw new Error("Betalingsregistratie niet gevonden.");

  if (isPlatformOwner(session)) return { session, confirmation };

  if (confirmation.recordedById && confirmation.recordedById !== session.user.id) {
    throw new Error("Alleen wie de betaling oorspronkelijk registreerde kan deze corrigeren.");
  }

  return { session, confirmation };
}
