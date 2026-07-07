import { NextRequest, NextResponse } from "next/server";
import { ContractStatus } from "@prisma/client";
import { ZodError } from "zod";
import { ContractService } from "@/modules/contract/services/contract.service";
import { CreateContractInput } from "@/modules/contract/services/contract.types";
import { ContractSchema } from "@/modules/contract/services/contract.validators";
import { SentooService } from "@/infrastructure/sentoo/sentoo.service";
import { PaymentCreate } from "@/modules/payment/services/payment.validators";
import { prisma } from "@/lib/prisma";
import { PaymentService } from "@/modules/payment/services/payment.service";

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

    // 2. Crear el pago en Sentoo.
    const totalWithTax = 45;

    // 3. Crea el pago en Sentoo
    const sentooResponse = await SentooService.createTransaction({
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
