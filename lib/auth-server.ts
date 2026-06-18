// lib/auth-server.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function requireAuth(request: Request) {
  const session = await getServerSession({
    req: request as any,
    res: undefined,
    ...authOptions,
  });

  if (!session?.user?.tenant_id) {
    throw new Error("UNAUTHORIZED");
  }

  return session;
}
