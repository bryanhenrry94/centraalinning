import { NextResponse } from "next/server";
import { ContractService } from "@/services/contract/contract.service";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { BlockadeService } from "@/services/blockade/blockade.service";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);

  const { searchParams } = new URL(req.url);

  if (!session?.user?.tenant_id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const search = searchParams.get("search") || "";
  const page = searchParams.get("page") || "1";

  const blockades = await BlockadeService.list(
    session.user.tenant_id,
    search,
    page,
  );

  return NextResponse.json(blockades);
}
