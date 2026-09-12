import { getServerSession, Session } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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

// Alleen de deurwaarder die aan dit vonnis is toegewezen (of PLATFORM_OWNER)
// mag het bewerken/verwijderen — zelfde regel als het registreren ervan
// (zie requireAssignedBailiff in
// modules/legal-process/services/legal-process-guards.ts). Deze legacy
// verdict.actions.ts had voorheen geen enkele autorisatiecontrole.
export async function requireAssignedBailiffForVerdict(verdictId: string) {
  const session = await getSessionOrThrow();

  const verdict = await prisma.verdict.findUnique({
    where: { id: verdictId },
    include: { bailiff: true },
  });
  if (!verdict) throw new Error("Vonnis niet gevonden.");

  if (isPlatformOwner(session)) return { session, verdict };

  const isAssignedBailiff = verdict.bailiff?.user_id === session.user.id;
  if (!isAssignedBailiff) {
    throw new Error("Alleen de toegewezen deurwaarder kan dit vonnis bewerken.");
  }
  return { session, verdict };
}
