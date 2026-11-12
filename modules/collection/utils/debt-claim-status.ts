import { AopStep } from "@/modules/collection/services/collection.validators";
import { STATUS_HEX } from "@/shared/constants/status-colors";

export type ChipColor =
  | "default"
  | "primary"
  | "warning"
  | "info"
  | "error"
  | "success";

// Paleta CFSB aprobada (zie shared/constants/status-colors.ts) — hex exacto,
// no los colores semánticos por defecto de MUI.
export const DEBT_CLAIM_STATUS_CONFIG: Record<
  string,
  { label: string; color: string }
> = {
  OPEN: { label: "Wacht op betaling", color: STATUS_HEX.blue },
  IN_PROGRESS: { label: "In behandeling", color: STATUS_HEX.blue },
  SETTLED: { label: "Volledig betaald", color: STATUS_HEX.green },
  CLOSED: { label: "Gesloten", color: STATUS_HEX.grey },
  CANCELLED: { label: "Geannuleerd", color: STATUS_HEX.grey },
};

// Labels/kleuren van de AOP-meldingenketen (AANMANING → SOMMATIE →
// INGEBREKESTELLING → BLOKKADE) — dit zijn de statussen die de gebruiker
// effectief herkent, niet de kale DebtClaimStatus (OPEN/IN_PROGRESS/...).
export const AOP_STEP_CONFIG: Record<AopStep, { label: string; color: string }> = {
  REMINDER: { label: "Aanmaning verzonden", color: STATUS_HEX.blue },
  FINAL_NOTICE: { label: "Sommatie verzonden", color: STATUS_HEX.blue },
  DEFAULT_NOTICE: { label: "Ingebrekestelling verzonden", color: STATUS_HEX.red },
  BLK_NOTIFICATION: { label: "Economische blokkade", color: STATUS_HEX.red },
};

export function getDebtClaimStatusInfo(status: string) {
  return DEBT_CLAIM_STATUS_CONFIG[status] ?? { label: status, color: STATUS_HEX.grey };
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
    DEBT_CLAIM_STATUS_CONFIG[status] ?? { label: status, color: STATUS_HEX.grey }
  );
}

// Status van een AdministrativeCollectionStep (WorkflowStatus in het schema).
export const WORKFLOW_STATUS_CONFIG: Record<
  string,
  { label: string; color: ChipColor }
> = {
  PENDING: { label: "In afwachting", color: "warning" },
  IN_PROGRESS: { label: "In behandeling", color: "warning" },
  COMPLETED: { label: "Voltooid", color: "success" },
  CANCELLED: { label: "Geannuleerd", color: "default" },
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
  PENDING: { label: "In afwachting", color: "warning" },
  INVOICED: { label: "Gefactureerd", color: "info" },
  PAID: { label: "Betaald", color: "success" },
  WAIVED: { label: "Kwijtgescholden", color: "default" },
  CANCELLED: { label: "Geannuleerd", color: "default" },
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
  PENDING: { label: "In afwachting", color: "warning" },
  PARTIALLY_PAID: { label: "Gedeeltelijk betaald", color: "warning" },
  PAID: { label: "Betaald", color: "success" },
  CANCELLED: { label: "Geannuleerd", color: "default" },
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
  COLLECTION: "CFSB-kosten",
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
