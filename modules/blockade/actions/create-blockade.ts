"use server";
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
    const result = await BlockadeService.createFull(input, tenantId);

    if (!result.success) {
      return result;
    }

    sendMailBlockade(result.debtorEmail!, result.debtorName!, result.creditorName!);

    return { success: true, id: result.id };
  } catch (error: any) {
    console.error(error);
    return { success: false, message: error?.message || "Error creating blockade" };
  }
}
