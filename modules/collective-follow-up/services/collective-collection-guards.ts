import { getServerSession, Session } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@/shared/constants/user-role";

// Roles que representan al "participante" (cliente/acreedor) dentro de un
// tenant, en oposición a DEBTOR — mismo trío que case-transfer-guards.ts /
// legal-process-guards.ts (duplicado a propósito, patrón ya establecido en
// este repo: cada módulo tiene sus propios guards).
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

export async function requireTenantStaffForCollection(collectionId: string) {
  const collection = await prisma.collectiveCollection.findUnique({
    where: { id: collectionId },
    include: { debtClaim: true },
  });
  if (!collection) throw new Error("Dossier niet gevonden.");

  const session = await getSessionOrThrow();
  if (isPlatformOwner(session)) return { session, collection };

  if (!isTenantStaff(session) || session.user.tenant_id !== collection.debtClaim.tenantId) {
    throw new Error("Alleen medewerkers van deze organisatie kunnen deze actie uitvoeren.");
  }
  return { session, collection };
}

// Solicitar un acuerdo de pago es un acto exclusivo del propio deudor
// (mismo patrón que el resto del sistema usa para acciones self-service del
// deudor: comparar session.user.id contra debtor.user_id).
export async function requireDebtorForCollection(collectionId: string) {
  const session = await getSessionOrThrow();

  const collection = await prisma.collectiveCollection.findUnique({
    where: { id: collectionId },
    include: { debtClaim: { include: { debtor: true } } },
  });
  if (!collection) throw new Error("Dossier niet gevonden.");

  if (isPlatformOwner(session)) return { session, collection };

  const isOwningDebtor = collection.debtClaim.debtor.user_id === session.user.id;
  if (!isOwningDebtor) {
    throw new Error("Alleen de debiteur zelf kan deze actie uitvoeren.");
  }
  return { session, collection };
}

// Consecuencia concreta del plazo de gracia (debtorGracePeriodDeadline):
// solo un actor a la vez puede solicitar un acuerdo de pago — nunca ambos
// simultáneamente.
//   - antes del plazo: solo el deudor dueño del expediente.
//   - vencido el plazo, con empleador confirmado: solo el staff de ese
//     tenant, actuando en nombre del deudor.
//   - vencido el plazo, sin empleador confirmado: sigue abierto al deudor.
export async function requireDebtorOrEmployerForNegotiation(collectionId: string) {
  const session = await getSessionOrThrow();

  const collection = await prisma.collectiveCollection.findUnique({
    where: { id: collectionId },
    include: { debtClaim: { include: { debtor: true } } },
  });
  if (!collection) throw new Error("Dossier niet gevonden.");

  if (isPlatformOwner(session)) {
    return { session, collection, submittedByRole: "DEBTOR" as const };
  }

  const isOwningDebtor = collection.debtClaim.debtor.user_id === session.user.id;
  const isMatchedEmployerStaff =
    !!collection.employerTenantId &&
    isTenantStaff(session) &&
    session.user.tenant_id === collection.employerTenantId;

  const gracePeriodPassed =
    !!collection.debtorGracePeriodDeadline && collection.debtorGracePeriodDeadline <= new Date();

  if (!gracePeriodPassed) {
    if (!isOwningDebtor) {
      throw new Error(
        "De bedenktermijn van de debiteur loopt nog — alleen de debiteur zelf kan deze actie uitvoeren.",
      );
    }
    return { session, collection, submittedByRole: "DEBTOR" as const };
  }

  if (collection.employerTenantId) {
    if (!isMatchedEmployerStaff) {
      throw new Error(
        "De bedenktermijn is verstreken — alleen de gematchte werkgever kan deze aanvraag namens de debiteur indienen.",
      );
    }
    return { session, collection, submittedByRole: "EMPLOYER" as const };
  }

  if (!isOwningDebtor) {
    throw new Error("Alleen de debiteur zelf kan deze actie uitvoeren.");
  }
  return { session, collection, submittedByRole: "DEBTOR" as const };
}

// Responder una pregunta de broadcast de red es un acto del staff del
// tenant que fue PREGUNTADO (response.tenantId), no del tenant dueño del
// expediente — a diferencia de requireTenantStaffForCollection.
export async function requireTenantStaffForNetworkQuery(queryId: string, tenantId: string) {
  const response = await prisma.cOLNetworkResponse.findUnique({
    where: { queryId_tenantId: { queryId, tenantId } },
  });
  if (!response) throw new Error("Netwerkvraag niet gevonden voor deze organisatie.");

  const session = await getSessionOrThrow();
  if (isPlatformOwner(session)) return { session, response };

  if (!isTenantStaff(session) || session.user.tenant_id !== response.tenantId) {
    throw new Error("Alleen medewerkers van deze organisatie kunnen deze actie uitvoeren.");
  }
  return { session, response };
}

// Decidir una negociación (aceptar/aceptar modificado/rechazar) es un acto
// exclusivo del staff del tenant — CFSB no decide, y en COP no hay abogado
// ni alguacil todavía (eso es GOP).
export async function requireTenantStaffForNegotiation(negotiationId: string) {
  const negotiation = await prisma.cOLNegotiation.findUnique({
    where: { id: negotiationId },
    include: { collection: { include: { debtClaim: true } } },
  });
  if (!negotiation) throw new Error("Betalingsregeling niet gevonden.");

  const session = await getSessionOrThrow();
  if (isPlatformOwner(session)) return { session, negotiation };

  if (
    !isTenantStaff(session) ||
    session.user.tenant_id !== negotiation.collection.debtClaim.tenantId
  ) {
    throw new Error("Alleen medewerkers van deze organisatie kunnen deze actie uitvoeren.");
  }
  return { session, negotiation };
}
