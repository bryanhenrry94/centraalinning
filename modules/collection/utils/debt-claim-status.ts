import { AopStep } from "@/modules/collection/services/collection.validators";

export type ChipColor =
  | "default"
  | "primary"
  | "warning"
  | "info"
  | "error"
  | "success";

export const DEBT_CLAIM_STATUS_CONFIG: Record<
  string,
  { label: string; color: ChipColor }
> = {
  OPEN: { label: "Wacht op betaling", color: "primary" },
  IN_PROGRESS: { label: "In behandeling", color: "info" },
  SETTLED: { label: "Vereffend", color: "success" },
  CLOSED: { label: "Gesloten", color: "default" },
  CANCELLED: { label: "Geannuleerd", color: "error" },
};

export const AOP_STEP_CONFIG: Record<
  AopStep,
  { label: string; color: ChipColor }
> = {
  REMINDER: { label: "Aanmaning", color: "info" },
  FINAL_NOTICE: { label: "Sommatie", color: "warning" },
  DEFAULT_NOTICE: { label: "Ingebrekestelling", color: "error" },
  BLK_NOTIFICATION: { label: "Blokkade", color: "error" },
};

export function getDebtClaimStatusInfo(status: string) {
  return DEBT_CLAIM_STATUS_CONFIG[status] ?? { label: status, color: "default" as ChipColor };
}

export function getAopStepInfo(step: AopStep) {
  return AOP_STEP_CONFIG[step];
}

// Status van een AdministrativeCollectionStep (WorkflowStatus in het schema).
export const WORKFLOW_STATUS_CONFIG: Record<
  string,
  { label: string; color: ChipColor }
> = {
  PENDING: { label: "In afwachting", color: "default" },
  IN_PROGRESS: { label: "In behandeling", color: "info" },
  COMPLETED: { label: "Voltooid", color: "success" },
  CANCELLED: { label: "Geannuleerd", color: "error" },
};

export function getWorkflowStatusInfo(status: string) {
  return (
    WORKFLOW_STATUS_CONFIG[status] ?? { label: status, color: "default" as ChipColor }
  );
}
