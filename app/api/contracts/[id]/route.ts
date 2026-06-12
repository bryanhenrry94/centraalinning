// app/api/contracts/[id]/route.ts

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ContractService } from "@/services/contract/contract.service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.tenant_id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const contract = await ContractService.getById(id);

  if (!contract) {
    return NextResponse.json(
      { message: "Contract not found" },
      { status: 404 },
    );
  }

  return NextResponse.json(contract);
}
