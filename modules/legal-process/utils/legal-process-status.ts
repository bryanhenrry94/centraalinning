import { LegalProcessStatus } from "@/modules/legal-process/constants/legal-process-status";

type StatusColor = "default" | "info" | "warning" | "success" | "error";

export const OPEN_LEGAL_PROCESS_STATUSES = [
  LegalProcessStatus.PENDING_ACCEPTANCE,
  LegalProcessStatus.IN_PROCEDURE,
  LegalProcessStatus.GOP_ACTIVE,
  LegalProcessStatus.GOP_INACTIVE,
] as const;

export const COMPLETED_LEGAL_PROCESS_STATUSES = [LegalProcessStatus.CLOSED] as const;

const LEGAL_PROCESS_STATUS_CONFIG: Record<string, { label: string; color: StatusColor }> = {
  PENDING_ACCEPTANCE: { label: "Wacht op advocaat", color: "default" },
  REJECTED: { label: "Afgewezen", color: "error" },
  IN_PROCEDURE: { label: "In gerechtelijke procedure", color: "info" },
  GOP_ACTIVE: { label: "GOP Actief", color: "info" },
  GOP_INACTIVE: { label: "GOP Inactief", color: "warning" },
  GOP_CANCELLED: { label: "GOP Geannuleerd", color: "error" },
  CLOSED: { label: "Gesloten", color: "success" },
};

export function getLegalProcessStatusInfo(status: string) {
  return (
    LEGAL_PROCESS_STATUS_CONFIG[status] ?? {
      label: status,
      color: "default" as StatusColor,
    }
  );
}

const GOP_INACTIVE_REASON_LABELS: Record<string, string> = {
  NO_SEIZABLE_ASSETS: "Geen beslagbare goederen",
  DEBTOR_ABROAD: "Debiteur woont in het buitenland",
  NO_INCOME: "Geen inkomen",
  NO_ATTACHABLE_PROPERTY: "Geen beslagbaar vermogen",
  OTHER: "Andere reden",
};

export function getGopInactiveReasonLabel(reason: string) {
  return GOP_INACTIVE_REASON_LABELS[reason] ?? reason;
}
