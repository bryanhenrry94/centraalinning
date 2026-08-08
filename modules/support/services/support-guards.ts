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

// Solo CFSB (platform owner) beheert de inbox van berichten.
export async function requirePlatformOwner() {
  const session = await getSessionOrThrow();
  if (!isPlatformOwner(session)) {
    throw new Error("Alleen CFSB-medewerkers kunnen deze actie uitvoeren.");
  }
  return { session };
}

// Een bericht kan bekeken worden door wie het verstuurde, of door CFSB.
export async function requireOwnerOrPlatformOwner(supportMessageId: string) {
  const session = await getSessionOrThrow();

  const supportMessage = await prisma.supportMessage.findUnique({
    where: { id: supportMessageId },
  });
  if (!supportMessage) throw new Error("Bericht niet gevonden.");

  if (isPlatformOwner(session) || supportMessage.createdById === session.user.id) {
    return { session, supportMessage };
  }

  throw new Error("U heeft geen toegang tot dit bericht.");
}

export { getSessionOrThrow, isPlatformOwner };
