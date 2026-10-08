import { AopStep } from "@/modules/collection/services/collection.validators";

export type ChipColor =
  | "default"
  | "primary"
  | "warning"
  | "info"
  | "error"
  | "success";

// CCP-kleurenregel (systeembreed): geel/amber = in afwachting/concept/lopend
// proces; groen = actief, geaccepteerd, betaald of succesvol afgerond; rood =
// blokkade, afwijzing, fout of kritieke waarschuwing; grijs = secundaire
// informatie/niet-actieve onderdelen (incl. vrijwillig geannuleerd — dat is
// geen afwijzing/fout, dus geen rood).
export const DEBT_CLAIM_STATUS_CONFIG: Record<
  string,
  { label: string; color: ChipColor }
> = {
  OPEN: { label: "Wacht op betaling", color: "warning" },
  IN_PROGRESS: { label: "In behandeling", color: "warning" },
  SETTLED: { label: "Vereffend", color: "success" },
  CLOSED: { label: "Gesloten", color: "default" },
  CANCELLED: { label: "Geannuleerd", color: "default" },
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
