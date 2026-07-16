import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { ContractService } from "@/modules/contract/services/contract.service";
import { CreateContractInput } from "@/modules/contract/services/contract.types";
import { ContractSchema } from "@/modules/contract/services/contract.validators";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { tenant_id } = body;

    if (!tenant_id) {
      return NextResponse.json(
        { error: "tenant_id is required" },
        { status: 400 },
      );
    }

    const parsed = ContractSchema.parse(body);

    const contractData: CreateContractInput = {
      ...parsed,
      status: "DRAFT",
      documents: parsed.documents ?? [],
    };

    const contract = await ContractService.create(tenant_id, contractData);

    return NextResponse.json({ contract });
  } catch (error: any) {
    console.error(error);

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validatiefout", details: error.issues },
        { status: 400 },
      );
    }

    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Reference number already exists" },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: "Failed to create contract" },
      { status: 500 },
    );
  }
}
