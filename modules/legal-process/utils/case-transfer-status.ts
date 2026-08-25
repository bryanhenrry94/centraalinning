import { CaseTransferStatus } from "@/modules/legal-process/constants/case-transfer-status";

type StatusColor = "default" | "info" | "warning" | "success" | "error";

const CASE_TRANSFER_STATUS_CONFIG: Record<string, { label: string; color: StatusColor }> = {
  PENDING_PAYMENT: { label: "Wacht op betaling overdrachtscommissie", color: "default" },
  PENDING_ACCEPTANCE: { label: "Wacht op advocaat/deurwaarder", color: "default" },
  ACCEPTED: { label: "Geaccepteerd — in behandeling", color: "info" },
  REJECTED: { label: "Afgewezen", color: "error" },
  WORK_COMPLETED: { label: "Werk afgerond", color: "success" },
  CANCELLED: { label: "Geannuleerd", color: "error" },
};

// Para ACCEPTED, el label distingue si el dossier quedó "Overgedragen aan
// advocaat" o "Overgedragen aan deurwaarder" (spec: el estado debe reflejar
// a quién fue transferido). Pasar assignee cuando esté disponible.
export function getCaseTransferStatusInfo(
  status: string,
  assignee?: { lawyerId?: string | null; bailiffId?: string | null },
) {
  if (status === "ACCEPTED" && assignee) {
    return assignee.lawyerId
      ? { label: "Overgedragen aan advocaat", color: "info" as StatusColor }
      : { label: "Overgedragen aan deurwaarder", color: "info" as StatusColor };
  }

  return (
    CASE_TRANSFER_STATUS_CONFIG[status] ?? {
      label: status,
      color: "default" as StatusColor,
    }
  );
}

export { CaseTransferStatus };
