import { CaseTransferService } from "@/modules/legal-process/services/case-transfer.service";

// AT-012/AT-013: si el abogado/alguacil no acepta ni rechaza un dossier
// dentro del plazo de 7 días desde que se confirmó el pago de la comisión
// de transferencia, el dossier se rechaza automáticamente para que el
// participante pueda elegir otro profesional.
export async function checkCaseTransferDeadlines() {
  const expired = await CaseTransferService.expireOverdueTransfers();
  return { message: "Overdracht-termijnen gecontroleerd", expired };
}
