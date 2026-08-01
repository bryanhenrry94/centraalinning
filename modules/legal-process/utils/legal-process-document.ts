import { TableSummaryResponse } from "@/modules/dashboard/types/report.types";
import { LegalProcessService } from "@/modules/legal-process/services/legal-process.service";
import { getLegalProcessStatusInfo } from "@/modules/legal-process/utils/legal-process-status";

type LegalProcessForLawyer = Awaited<
  ReturnType<typeof LegalProcessService.getForLawyerUser>
>[number];

export function toDocumentRow(legalProcess: LegalProcessForLawyer): TableSummaryResponse {
  const statusInfo = getLegalProcessStatusInfo(legalProcess.status);
  const person = legalProcess.debtClaim.debtor?.person;

  return {
    id: legalProcess.id,
    source: "GOP - Gerechtelijke opvolging",
    date: legalProcess.startedAt,
    reference_number: legalProcess.referenceNumber || legalProcess.debtClaim.reference || "",
    name: person ? `${person.first_name ?? ""} ${person.last_name ?? ""}`.trim() : "-",
    amount: Number(legalProcess.debtClaim.principalAmount ?? 0),
    status: statusInfo.label,
    statusColor: statusInfo.color,
    href: `/legal-processes/${legalProcess.id}`,
  };
}
