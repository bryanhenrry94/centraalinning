"use server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { CreateBlockadeInput } from "@/modules/blockade/services/blockade.validators";
import { BlockadeService } from "@/modules/blockade/services/blockade.service";
import { sendMailBlockade } from "@/modules/blockade/services/blockade-mail.service";

type CreateBlockadeResponse = {
  success: boolean;
  message?: string;
  id?: string;
};

export async function createBlockadeAction(
  input: CreateBlockadeInput,
  tenantId: string,
): Promise<CreateBlockadeResponse> {
  try {
    const session = await getServerSession(authOptions);
    const result = await BlockadeService.createFull(input, tenantId, session?.user?.id);

    if (!result.success) {
      return result;
    }

    return { success: true, id: result.id };
  } catch (error: any) {
    console.error(error);
    return {
      success: false,
      message: error?.message || "Error creating blockade",
    };
  }
}

export async function updatePaymentReference(
  blockadeId: string,
  input: { paymentId: string },
): Promise<CreateBlockadeResponse> {
  try {
    const result = await BlockadeService.updatePaymentReference(
      blockadeId,
      input,
    );

    if (!result.success) {
      return result;
    }

    return { success: true, id: result.id };
  } catch (error: any) {
    console.error(error);
    return {
      success: false,
      message: error?.message || "Error updating blockade",
    };
  }
}
