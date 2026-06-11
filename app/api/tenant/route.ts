import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { TenantService } from "@/services/tenant/tenant.service";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.tenant_id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenant = await TenantService.getById(session.user.tenant_id);

  return NextResponse.json(tenant);
}
