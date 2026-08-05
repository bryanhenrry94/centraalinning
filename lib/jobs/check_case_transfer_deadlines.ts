import { CaseTransferService } from "@/modules/legal-process/services/case-transfer.service";

// AT-012/AT-013: día 5 recordatorio al abogado/alguacil, día 7 aviso al
// participante para que decida (extender 7 días más o elegir otro
// profesional). El plazo nunca vence ni se rechaza automáticamente.
export async function checkCaseTransferDeadlines() {
  const result = await CaseTransferService.sendAcceptanceReminders();
  return { message: "Overdracht-termijnen gecontroleerd", ...result };
}
