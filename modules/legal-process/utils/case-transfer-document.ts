import { TableSummaryResponse } from "@/modules/dashboard/types/report.types";
import { CaseTransferService } from "@/modules/legal-process/services/case-transfer.service";
import { getCaseTransferStatusInfo } from "@/modules/legal-process/utils/case-transfer-status";

type CaseTransferForLawyer = Awaited<
  ReturnType<typeof CaseTransferService.getForLawyerUser>
>[number];

export function toCaseTransferDocumentRow(caseTransfer: CaseTransferForLawyer): TableSummaryResponse {
  const statusInfo = getCaseTransferStatusInfo(caseTransfer.status);
  const person = caseTransfer.debtClaim.debtor?.person;

  return {
    id: caseTransfer.id,
    source: "GOP - Overdracht",
    date: caseTransfer.createdAt,
    reference_number: caseTransfer.debtClaim.reference || "",
    name: person ? `${person.first_name ?? ""} ${person.last_name ?? ""}`.trim() : "-",
    amount: Number(caseTransfer.debtClaim.principalAmount ?? 0),
    status: statusInfo.label,
    statusColor: statusInfo.color,
    href: `/legal-processes/transfers/${caseTransfer.id}`,
  };
}
