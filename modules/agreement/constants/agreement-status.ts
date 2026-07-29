export enum AgreementStatus {
  PENDING = "PENDING",
  IN_NEGOTIATION = "IN_NEGOTIATION",
  COUNTEROFFER = "COUNTEROFFER",
  ACCEPTED = "ACCEPTED",
  REJECTED = "REJECTED",
  CANCELLED = "CANCELLED",
  CLOSED = "CLOSED",
}

// Un acuerdo solo es efectivo (monto de cuota sugerido, workflow AOP pausado)
// una vez que el tenant lo aprueba.
export const isAgreementApproved = (status?: string | null): boolean =>
  status === AgreementStatus.ACCEPTED;

// Awaiting a decision from the tenant: still just a "solicitud", not binding.
export const isAgreementPending = (status?: string | null): boolean =>
  status === AgreementStatus.PENDING ||
  status === AgreementStatus.IN_NEGOTIATION ||
  status === AgreementStatus.COUNTEROFFER;

export const hasOpenAgreement = (status?: string | null): boolean =>
  isAgreementApproved(status) || isAgreementPending(status);
