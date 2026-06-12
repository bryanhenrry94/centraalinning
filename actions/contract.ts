"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

import { ContractSchema } from "@/services/contract/contract.validators";
import { CreateContractInput } from "@/services/contract/contract.types";

import { ContractService } from "@/services/contract/contract.service";

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
    const input = ContractSchema.parse(data);

    const referenceNumber = await ContractService.generateContractReference();

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

          contract_type: input.contract_type,

          parties: {
            create: input.parties.map((party) => ({
              role: party.role,
              person_type:
                (party.person_type as "INDIVIDUAL" | "COMPANY") || "INDIVIDUAL",
              identification_type: party.identification_type,
              identification: party.identification,
              contact_person: party.fullname,
              fullname: party.fullname,
              email: party.email,
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
            fullname: true,
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

export async function lastContracts(
  tenantId: string,
  limit: number = 5,
): Promise<ActionResponse> {
  const contracts = await prisma.contract.findMany({
    where: {
      tenant_id: tenantId,
    },
    orderBy: {
      created_at: "desc",
    },
    take: limit,
    select: {
      id: true,
      reference_number: true,
      status: true,
      created_at: true,
      amount: true,
      // debtor: {
      //   select: {
      //     fullname: true,
      //   },
      // },
    },
  });

  return {
    success: true,
    data: contracts.map((contract) => ({
      id: contract.id,
      reference_number: contract.reference_number,
      status: contract.status,
      created_at: contract.created_at,
      amount: contract.amount,
    })),
  };
}

export async function updateStatusContract(
  contractId: string,
  tenantId: string,
  status: "DRAFT" | "PENDING_PAYMENT" | "REGISTERED" | "CANCELLED",
): Promise<ActionResponse> {
  try {
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

    const contract = await prisma.contract.update({
      where: {
        id: contractId,
      },

      data: {
        status: status as any,
      },
    });

    // revalidatePath("/contracts");
    // revalidatePath(`/contracts/${contractId}`);

    return {
      success: true,
      data: contract,
    };
  } catch (error) {
    console.error("[UPDATE_STATUS_CONTRACT]", error);

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to update contract status",
    };
  }
}

export async function updateContract(
  contractId: string,
  tenantId: string,
  data: CreateContractInput,
): Promise<ActionResponse> {
  try {
    const input = ContractSchema.parse(data);

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

          contract_type: input.contract_type,

          parties: {
            deleteMany: {},

            create: input.parties.map((party) => ({
              person_type: party.person_type as "INDIVIDUAL" | "COMPANY",
              role: party.role,
              fullname: party.fullname,
              identification_type: party.identification_type,
              identification: party.identification,
              email: party.email,
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
