"use server";

import { revalidatePath } from "next/cache";
import { ContractSchema } from "@/modules/contract/services/contract.validators";
import { CreateContractInput } from "@/modules/contract/services/contract.types";
import { ContractService } from "@/modules/contract/services/contract.service";

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
    const contract = await ContractService.create(tenantId, input);
    revalidatePath("/workstation");
    return { success: true, data: contract };
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
    const contract = await ContractService.getByIdForTenant(
      contractId,
      tenantId,
    );
    if (!contract) return { success: false, error: "Contract not found" };
    return { success: true, data: contract };
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
    const contracts = await ContractService.listAll(tenantId);
    return { success: true, data: contracts };
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
  const contracts = await ContractService.last(tenantId, limit);
  return {
    success: true,
    data: contracts.map((c) => ({
      id: c.id,
      reference_number: c.reference_number,
      status: c.status,
      created_at: c.created_at,
      amount: c.amount,
    })),
  };
}

export async function updateStatusContract(
  contractId: string,
  tenantId: string,
  status: "DRAFT" | "REGISTERED",
): Promise<ActionResponse> {
  try {
    const contract = await ContractService.updateStatus(
      contractId,
      tenantId,
      status,
    );
    return { success: true, data: contract };
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

export async function deleteContract(
  contractId: string,
  tenantId: string,
): Promise<ActionResponse> {
  try {
    await ContractService.deleteById(contractId, tenantId);
    revalidatePath("/contracts");
    return { success: true };
  } catch (error) {
    console.error("[DELETE_CONTRACT]", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to delete contract",
    };
  }
}
