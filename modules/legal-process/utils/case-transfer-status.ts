import { CaseTransferStatus } from "@/modules/legal-process/constants/case-transfer-status";

type StatusColor = "default" | "info" | "warning" | "success" | "error";

const CASE_TRANSFER_STATUS_CONFIG: Record<string, { label: string; color: StatusColor }> = {
  PENDING_PAYMENT: { label: "Wacht op betaling", color: "default" },
  PENDING_ACCEPTANCE: { label: "Wacht op advocaat/deurwaarder", color: "default" },
  ACCEPTED: { label: "In gerechtelijke procedure", color: "info" },
  REJECTED: { label: "Afgewezen", color: "error" },
  WORK_COMPLETED: { label: "Trabajo finalizado", color: "success" },
  CANCELLED: { label: "Geannuleerd", color: "error" },
};

export function getCaseTransferStatusInfo(status: string) {
  return (
    CASE_TRANSFER_STATUS_CONFIG[status] ?? {
      label: status,
      color: "default" as StatusColor,
    }
  );
}

export { CaseTransferStatus };
