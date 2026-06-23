import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { BlockadeService } from "@/services/blockade/blockade.service";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.tenant_id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);

  const search = searchParams.get("search") || "";
  const page = Number(searchParams.get("page") || "1");
  const limit = Number(searchParams.get("limit") || "10");

  const blockades = await BlockadeService.list(
    session.user.tenant_id,
    search,
    page,
    limit,
  );

  return NextResponse.json(blockades);
}
