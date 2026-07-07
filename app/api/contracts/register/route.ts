import { NextRequest, NextResponse } from "next/server";
import { ContractStatus } from "@prisma/client";
import { ContractService } from "@/services/contract/contract.service";
import {
  ContractPartyInput,
  CreateContractInput,
} from "@/services/contract/contract.types";
import { createSentooPayment } from "@/actions/sentoo.actions";
import { PaymentCreate } from "@/lib/validations/payment";
import { prisma } from "@/lib/prisma";
import { PaymentService } from "@/services/payments/payment.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    console.log("Received contract data:", body);

    const {
      tenant_id,
      contract_type,
      contract_date,
      start_date,
      end_date,
      amount,
      installment_count,
      installment_amount,
      description,
    } = body;

    // Validations
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
    const referenceNumber = await ContractService.generateContractReference();

    const contractData: CreateContractInput = {
      contract_type: contract_type as any,
      contract_date: new Date(contract_date).toISOString(),
      start_date: new Date(start_date).toISOString(),
      end_date: end_date ? new Date(end_date).toISOString() : null,
      amount: Number(amount),
      installment_count: installment_count || null,
      installment_amount: installment_amount
        ? Number(installment_amount)
        : undefined,
      description: description || null,
      reference_number: referenceNumber,
      status: "DRAFT",
      documents: [],
      parties: body.parties.map((party: ContractPartyInput) => ({
        person_type:
          (party.person_type as "INDIVIDUAL" | "COMPANY") || "INDIVIDUAL",
        role: party.role,
        fullname: party.fullname,
        email: party.email || null,
        identification_type: party.identification_type || null,
        identification: party.identification || null,
        phone: party.phone || null,
        birth_date: party.birth_date ?? null,
        birth_place: party.birth_place ?? null,
        address: party.address ?? null,
      })),
    };

    const contract = await ContractService.create(tenant_id, contractData);

    // 2. Crear el pago en Sentoo.
    const totalWithTax = 45;

    // 3. Crea el pago en Sentoo
    const sentooResponse = await createSentooPayment({
      amount: totalWithTax, // YA en centavos
      description: `Betaling voor overeenkomst ${contract.reference_number}`,
      reference: contract.reference_number,
    });

    /**
     * Validar respuesta Sentoo
     */
    if (!sentooResponse?.success || !sentooResponse?.payment?.url) {
      throw new Error(
        sentooResponse?.error || "Kon de betaling niet aanmaken.",
      );
    }

    // 4. Registra el pago en la base de datos
    const paymentData: PaymentCreate = {
      debtClaim_id: null, // No hay una deuda previa, este es un pago directo por activación
      method: "TRANSFER",
      total_amount: totalWithTax,
      paid_at: null,
      status: "pending",
      contract_id: contract.id,
      provider: "sentoo",
      provider_ref: sentooResponse?.payment?.id,
      provider_payload: JSON.stringify(sentooResponse.raw),
      reference_number: contract.reference_number,
      agreement_id: null,
      payment_type: "CONTRACT_ACTIVATION",
    };

    const paymentRes = await PaymentService.registerPayment(
      tenant_id,
      paymentData,
    );
    console.log("Payment registered in DB:", paymentRes);

    if (!paymentRes) {
      throw new Error("Kon de betaling niet registreren.");
    }

    // 5. Cambiar el estado del contrato a PENDING_PAYMENT.
    await prisma.contract.update({
      where: {
        id: contract.id,
      },

      data: {
        status: ContractStatus.PENDING_PAYMENT,
      },
    });

    // 6. Devolver la URL de pago al frontend.
    const paymentUrl = sentooResponse.payment.url;

    return NextResponse.json({ contract, paymentUrl });
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
