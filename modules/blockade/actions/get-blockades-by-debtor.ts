"use server";
import { BlockadeService } from "@/modules/blockade/services/blockade.service";

export async function getBlockadesByDebtorAction(
  debtorId: string,
  tenantId: string,
) {
  return BlockadeService.getByDebtorId(debtorId, tenantId);
}
