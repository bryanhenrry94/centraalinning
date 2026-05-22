"use server";
import { prisma } from "@/lib/prisma";
import { Decimal } from "@prisma/client/runtime/library";

export const createFinancialReportRequest = async ({
  tenant_id,
  person_id,
  payment_id,
  amount,
}: {
  tenant_id: string;
  person_id: string;
  payment_id: string;
  amount: number;
}) => {
  try {
    const request = await prisma.financialReportRequest.create({
      data: {
        tenant_id,
        person_id,
        payment_id,
        amount: new Decimal(amount),
      },
    });

    return { success: true, data: request };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
};
