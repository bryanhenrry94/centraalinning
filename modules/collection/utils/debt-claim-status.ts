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

// vw_debtor_summary.source_status is the latest AOPStep when the debt claim
// has an administrative collection, otherwise it falls back to the raw
// DebtClaimStatus. Try both configs before giving up.
export function getSourceStatusInfo(status: string) {
  return (
    AOP_STEP_CONFIG[status as AopStep] ??
    DEBT_CLAIM_STATUS_CONFIG[status] ?? { label: status, color: "default" as ChipColor }
  );
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

// Status van een ClaimCharge.
export const CHARGE_STATUS_CONFIG: Record<
  string,
  { label: string; color: ChipColor }
> = {
  PENDING: { label: "In afwachting", color: "default" },
  INVOICED: { label: "Gefactureerd", color: "info" },
  PAID: { label: "Betaald", color: "success" },
  WAIVED: { label: "Kwijtgescholden", color: "default" },
  CANCELLED: { label: "Geannuleerd", color: "error" },
};

export function getChargeStatusInfo(status: string) {
  return (
    CHARGE_STATUS_CONFIG[status] ?? { label: status, color: "default" as ChipColor }
  );
}

// Status van een DebtClaimObligation.
export const OBLIGATION_STATUS_CONFIG: Record<
  string,
  { label: string; color: ChipColor }
> = {
  PENDING: { label: "In afwachting", color: "default" },
  PARTIALLY_PAID: { label: "Gedeeltelijk betaald", color: "warning" },
  PAID: { label: "Betaald", color: "success" },
  CANCELLED: { label: "Geannuleerd", color: "error" },
};

export function getObligationStatusInfo(status: string) {
  return (
    OBLIGATION_STATUS_CONFIG[status] ?? {
      label: status,
      color: "default" as ChipColor,
    }
  );
}

// Type van een DebtClaimObligation.
export const OBLIGATION_TYPE_LABELS: Record<string, string> = {
  PRINCIPAL_DEBT: "Hoofdsom",
  COLLECTION: "Incassokosten",
  INTEREST: "Rente",
  LEGAL_COST: "Gerechtelijke kosten",
};

export function getObligationTypeLabel(type: string) {
  return OBLIGATION_TYPE_LABELS[type] ?? type;
}

// Begunstigde van een DebtClaimObligation.
export const OBLIGATION_BENEFICIARY_LABELS: Record<string, string> = {
  PARTICIPANT: "Deelnemer",
  CFSB: "CFSB",
};

export function getObligationBeneficiaryLabel(beneficiary: string) {
  return OBLIGATION_BENEFICIARY_LABELS[beneficiary] ?? beneficiary;
}
