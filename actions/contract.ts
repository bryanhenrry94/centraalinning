"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

import {
  CreateContractInput,
  CreateContractSchema,
} from "@/lib/validations/contract";

import { generateContractReference } from "@/services/contract.service";

export interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function createContract(
  tenantId: string,
  data: CreateContractInput,
): Promise<ActionResponse> {
  try {
    const input = CreateContractSchema.parse(data);

    const referenceNumber = await generateContractReference();

    const contract = await prisma.$transaction(async (tx) => {
      return tx.contract.create({
        data: {
          tenant_id: tenantId,

          reference_number: referenceNumber,

          status: "REGISTERED",

          contract_date: input.contract_date,
          start_date: input.start_date,
          end_date: input.end_date ?? null,

          amount: input.amount,

          installment_count: input.installment_count ?? null,

          installment_amount: input.installment_amount ?? null,

          description: input.description ?? null,

          parties: {
            create: input.parties.map((party) => ({
              role: party.role,

              full_name: party.full_name,

              identification: party.identification,

              email: party.email,

              contact_person: party.contact_person,

              phone: party.phone,

              birth_date: party.birth_date ?? null,

              birth_place: party.birth_place ?? null,

              address: party.address ?? null,
            })),
          },

          documents: {
            create:
              input.documents?.map((doc) => ({
                file_name: doc.file_name,

                file_path: doc.file_path,

                mime_type: doc.mime_type,

                file_size: doc.file_size,
              })) ?? [],
          },
        },

        include: {
          parties: true,
          documents: true,
        },
      });
    });

    revalidatePath("/contracts");

    return {
      success: true,
      data: contract,
    };
  } catch (error) {
    console.error("[CREATE_CONTRACT]", error);

    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create contract",
    };
  }
}

export async function getContract(
  contractId: string,
  tenantId: string,
): Promise<ActionResponse> {
  try {
    const contract = await prisma.contract.findFirst({
      where: {
        id: contractId,
        tenant_id: tenantId,
      },

      include: {
        parties: true,
        documents: true,
      },
    });

    if (!contract) {
      return {
        success: false,
        error: "Contract not found",
      };
    }

    return {
      success: true,
      data: contract,
    };
  } catch (error) {
    console.error("[GET_CONTRACT]", error);

    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get contract",
    };
  }
}

export async function listContracts(tenantId: string): Promise<ActionResponse> {
  try {
    const contracts = await prisma.contract.findMany({
      where: {
        tenant_id: tenantId,
      },

      include: {
        parties: {
          select: {
            id: true,
            role: true,
            full_name: true,
            email: true,
            identification: true,
          },
        },
      },

      orderBy: {
        created_at: "desc",
      },
    });

    return {
      success: true,
      data: contracts,
    };
  } catch (error) {
    console.error("[LIST_CONTRACTS]", error);

    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to list contracts",
    };
  }
}

export async function updateContract(
  contractId: string,
  tenantId: string,
  data: CreateContractInput,
): Promise<ActionResponse> {
  try {
    const input = CreateContractSchema.parse(data);

    const existing = await prisma.contract.findFirst({
      where: {
        id: contractId,
        tenant_id: tenantId,
      },
    });

    if (!existing) {
      return {
        success: false,
        error: "Contract not found",
      };
    }

    const contract = await prisma.$transaction(async (tx) => {
      return tx.contract.update({
        where: {
          id: contractId,
        },

        data: {
          contract_date: input.contract_date,

          start_date: input.start_date,

          end_date: input.end_date ?? null,

          amount: input.amount,

          installment_count: input.installment_count ?? null,

          installment_amount: input.installment_amount ?? null,

          description: input.description ?? null,

          parties: {
            deleteMany: {},

            create: input.parties.map((party) => ({
              role: party.role,

              full_name: party.full_name,

              identification: party.identification,

              email: party.email,

              contact_person: party.contact_person,

              phone: party.phone,

              birth_date: party.birth_date ?? null,

              birth_place: party.birth_place ?? null,

              address: party.address ?? null,
            })),
          },

          documents: {
            deleteMany: {},

            create:
              input.documents?.map((doc) => ({
                file_name: doc.file_name,

                file_path: doc.file_path,

                mime_type: doc.mime_type,

                file_size: doc.file_size,
              })) ?? [],
          },
        },

        include: {
          parties: true,
          documents: true,
        },
      });
    });

    revalidatePath("/contracts");
    revalidatePath(`/contracts/${contractId}`);

    return {
      success: true,
      data: contract,
    };
  } catch (error) {
    console.error("[UPDATE_CONTRACT]", error);

    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update contract",
    };
  }
}

export async function deleteContract(
  contractId: string,
  tenantId: string,
): Promise<ActionResponse> {
  try {
    const contract = await prisma.contract.findFirst({
      where: {
        id: contractId,
        tenant_id: tenantId,
      },
    });

    if (!contract) {
      return {
        success: false,
        error: "Contract not found",
      };
    }

    await prisma.contract.delete({
      where: {
        id: contractId,
      },
    });

    revalidatePath("/contracts");

    return {
      success: true,
    };
  } catch (error) {
    console.error("[DELETE_CONTRACT]", error);

    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to delete contract",
    };
  }
}
