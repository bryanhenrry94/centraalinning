import { NextRequest, NextResponse } from "next/server";
import { CollectionService } from "@/services/collection/collection.service";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { CollectionCaseCreate } from "@/lib/validations/collection";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const session = await getServerSession(authOptions);

    if (!session?.user?.tenant_id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const payload: CollectionCaseCreate = {
      debtor_id: body.debtor_id,
      document_number: body.document_number,
      issue_date: new Date(body.issue_date),
      due_date: new Date(body.due_date),
      amount_original: body.amount_original,
      fee_rate: body.fee_rate,
      fee_amount: body.fee_amount,
      abb_rate: body.abb_rate,
      abb_amount: body.abb_amount,
      total_fined: body.total_fined,
      total_due: body.total_due,
      total_paid: body.total_paid,
      total_to_receive: body.total_to_receive,
      balance: body.balance,
      status: body.status,
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
