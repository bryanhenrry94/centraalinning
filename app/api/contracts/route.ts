import { NextResponse } from "next/server";
import { ContractService } from "@/modules/contract/services/contract.service";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);

  const { searchParams } = new URL(req.url);

  if (!session?.user?.tenant_id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const status = searchParams.get("status") || "ALL";
  const search = searchParams.get("search") || "";
  const page = searchParams.get("page") || "1";

  const contracts = await ContractService.list(
    session.user.tenant_id,
    status,
    search,
    page,
  );

  return NextResponse.json(contracts);
}
