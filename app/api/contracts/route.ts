import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generateContractReference } from "@/services/contract.service";
import { ContractPartyInput } from "@/lib/validations/contract_party";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    console.log("Received contract data:", body);

    const {
      tenant_id,
      contract_date,
      start_date,
      end_date,
      amount,
      installment_count,
      installment_amount,
      description,
    } = body;

    if (!tenant_id) {
      console.error("tenant_id is missing in the request body");
      return NextResponse.json(
        { error: "tenant_id is required" },
        { status: 400 },
      );
    }

    if (!contract_date) {
      console.error("contract_date is missing in the request body");
      return NextResponse.json(
        { error: "contract_date is required" },
        { status: 400 },
      );
    }

    if (!start_date) {
      console.error("start_date is missing in the request body");
      return NextResponse.json(
        { error: "start_date is required" },
        { status: 400 },
      );
    }

    if (!amount) {
      console.error("amount is missing in the request body");
      return NextResponse.json(
        { error: "amount is required" },
        { status: 400 },
      );
    }

    // generate a unique reference number if not provided
    const referenceNumber = await generateContractReference();

    const contract = await prisma.contract.create({
      data: {
        tenant_id,

        contract_date: new Date(contract_date),
        start_date: new Date(start_date),
        end_date: end_date ? new Date(end_date) : null,

        amount: new Prisma.Decimal(amount),

        installment_count: installment_count || null,

        installment_amount: installment_amount
          ? new Prisma.Decimal(installment_amount)
          : null,

        description,

        reference_number: referenceNumber,

        parties: {
          create: body.parties.map((party: ContractPartyInput) => ({
            full_name: party.full_name,
            role: party.role,
            email: party.email,
            identification: party.identification,
            contact_person: party.contact_person,
            phone: party.phone,
            birth_date: party.birth_date ?? null,
            birth_place: party.birth_place ?? null,
            address: party.address ?? null,
          })),
        },
      },
    });

    return NextResponse.json(contract);
  } catch (error: any) {
    console.error(error);

    if (error.code === "P2002") {
      return NextResponse.json(
        {
          error: "Reference number already exists",
        },
        {
          status: 409,
        },
      );
    }

    return NextResponse.json(
      {
        error: "Failed to create contract",
      },
      {
        status: 500,
      },
    );
  }
}
