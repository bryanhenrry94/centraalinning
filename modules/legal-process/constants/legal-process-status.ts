// GOP (Gerechtelijke Opvolging) solo existe desde que se registra un
// vonnis. Los estados previos (transferencia, aceptación, procedimiento con
// el abogado) viven en CaseTransferStatus — ver case-transfer-status.ts.
export enum LegalProcessStatus {
  GOP_DRAFT = "GOP_DRAFT",
  GOP_ACTIVE = "GOP_ACTIVE",
  GOP_INACTIVE = "GOP_INACTIVE",
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
  LegalProcessStatus.GOP_ACTIVE,
  LegalProcessStatus.GOP_INACTIVE,
];

// Estados en los que se puede registrar una sentencia ADICIONAL sobre un GOP
// ya activo (p.ej. un litigio en curso con más de una sentencia). El primer
// vonnis, el que crea el LegalProcess, se registra a partir de un
// CaseTransfer — ver CASE_TRANSFER_VERDICT_REGISTRABLE_STATUSES.
export const VERDICT_REGISTRABLE_STATUSES = [
  LegalProcessStatus.GOP_ACTIVE,
  LegalProcessStatus.GOP_INACTIVE,
];

// Estados en los que se pueden registrar medidas de ejecución, intereses o
// costos del alguacil: solo mientras el GOP está en marcha.
export const GOP_OPERABLE_STATUSES = [
  LegalProcessStatus.GOP_ACTIVE,
  LegalProcessStatus.GOP_INACTIVE,
];

// Fallback si el Superadministrador todavía no configuró el Setting
// "gop_fee_rate" para la isla/tenant — ver SettingsService.resolveNumber.
// Igual que collection_fee_rate, se guarda/resuelve como porcentaje entero
// (5 = 5%), no como fracción — dividir entre 100 al calcular el monto.
// Esta es la tarifa del PARTICIPANTE (activación del GOP).
export const DEFAULT_GOP_FEE_RATE_PERCENT = 5;

// Fallback para el Setting "gop_bailiff_fee_rate" — la comisión CFSB
// independiente del ALGUACIL sobre sus propios costos/facturas (ver
// LegalProcessService.submitBailiffFeeInvoice). Nunca se mezcla con
// DEFAULT_GOP_FEE_RATE_PERCENT.
export const DEFAULT_GOP_BAILIFF_FEE_RATE_PERCENT = 5;
