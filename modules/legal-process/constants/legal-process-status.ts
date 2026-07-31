export enum LegalProcessStatus {
  PENDING_ACCEPTANCE = "PENDING_ACCEPTANCE",
  REJECTED = "REJECTED",
  IN_PROCEDURE = "IN_PROCEDURE",
  GOP_ACTIVE = "GOP_ACTIVE",
  GOP_INACTIVE = "GOP_INACTIVE",
  GOP_CANCELLED = "GOP_CANCELLED",
  CLOSED = "CLOSED",
}

export enum GopInactiveReason {
  NO_SEIZABLE_ASSETS = "NO_SEIZABLE_ASSETS",
  DEBTOR_ABROAD = "DEBTOR_ABROAD",
  NO_INCOME = "NO_INCOME",
  NO_ATTACHABLE_PROPERTY = "NO_ATTACHABLE_PROPERTY",
  OTHER = "OTHER",
}

export const OPEN_LEGAL_PROCESS_STATUSES = [
  LegalProcessStatus.PENDING_ACCEPTANCE,
  LegalProcessStatus.IN_PROCEDURE,
  LegalProcessStatus.GOP_ACTIVE,
  LegalProcessStatus.GOP_INACTIVE,
];

// Estados en los que se puede registrar una sentencia: el procedimiento debe
// haber sido aceptado (IN_PROCEDURE), o ya haber una sentencia previa sobre
// el mismo expediente (GOP_ACTIVE/GOP_INACTIVE, p.ej. una sentencia
// adicional en un litigio en curso). Nunca sobre PENDING_ACCEPTANCE,
// REJECTED, GOP_CANCELLED o CLOSED.
export const VERDICT_REGISTRABLE_STATUSES = [
  LegalProcessStatus.IN_PROCEDURE,
  LegalProcessStatus.GOP_ACTIVE,
  LegalProcessStatus.GOP_INACTIVE,
];

// Estados en los que se pueden registrar medidas de ejecución, intereses o
// costos del alguacil: solo mientras el GOP está en marcha.
export const GOP_OPERABLE_STATUSES = [
  LegalProcessStatus.GOP_ACTIVE,
  LegalProcessStatus.GOP_INACTIVE,
];

export const GOP_FEE_RATE = 0.05;
