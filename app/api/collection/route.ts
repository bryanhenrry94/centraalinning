import { NextRequest, NextResponse } from "next/server";
import { CollectionService } from "@/services/collection/collection.service";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { DebtClaimCreate } from "@/lib/validations/collection";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const session = await getServerSession(authOptions);

    if (!session?.user?.tenant_id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const payload: DebtClaimCreate = {
      debtorId: body.debtorId,
      reference: body.reference,
      description: body.description,
      principalAmount: body.principalAmount,
      currentAmount: body.currentAmount ?? body.principalAmount,
      currency: body.currency ?? "USD",
      origin: body.origin ?? "MANUAL",
      status: body.status ?? "IN_PROGRESS",
    };

    const collection = await CollectionService.create(
      payload,
      session.user.tenant_id,
    );

    return NextResponse.json({ collection });
  } catch (error: any) {
    console.error("Error creating collection case:", error);
    return NextResponse.json(
      {
        error: "Failed to create collection case",
      },
      {
        status: 500,
      },
    );
  }
}
