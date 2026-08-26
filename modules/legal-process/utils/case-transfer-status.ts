import { CaseTransferStatus } from "@/modules/legal-process/constants/case-transfer-status";

type StatusColor = "default" | "info" | "warning" | "success" | "error";

// Labels kort houden (feedback sponsor): "aan advocaat/deurwaarder" is
// overbodig op het scherm van de toegewezen deurwaarder/advocaat zelf — die
// weet al dat het dossier aan hem overgedragen is.
const CASE_TRANSFER_STATUS_CONFIG: Record<string, { label: string; color: StatusColor }> = {
  PENDING_PAYMENT: { label: "Wacht op betaling", color: "default" },
  PENDING_ACCEPTANCE: { label: "Wacht op acceptatie", color: "default" },
  ACCEPTED: { label: "Overgedragen", color: "info" },
  REJECTED: { label: "Afgewezen", color: "error" },
  WORK_COMPLETED: { label: "Werk afgerond", color: "success" },
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
