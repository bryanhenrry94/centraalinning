// Etiquetas/colores de Chip para las pantallas de CFSB Admin (listados
// cross-tenant). A propósito NO reutiliza los *_STATUS_CONFIG de cada
// módulo de negocio (modules/collection/utils/debt-claim-status.ts,
// modules/legal-process/utils/case-transfer-status.ts, etc.) — esas
// pantallas de deelnemer/abogado/alguacil tienen su propio criterio de
// etiqueta y color, y no deben cambiar solo porque CFSB Admin ajustó las
// suyas (mismo criterio ya aplicado en Alle dossiers / Dossieroverdrachten).
//
// Regla de color acordada con el sponsor para CFSB Admin: nada de
// color="warning" (en este theme el warning queda amarillo, no naranja —
// ver shared/theme/colors.ts). "primary" es el naranja de marca
// (brand[400]) y es el color por defecto acá para cualquier estado
// "en curso / a la espera de algo" — success/error quedan para estados
// realmente terminales (positivo/negativo), info para estados neutros
// informativos, default para borrador/inactivo/archivado.
export type AdminChipColor = "default" | "primary" | "info" | "error" | "success";

export type AdminStatusInfo = { label: string; color: AdminChipColor };

function makeLookup(config: Record<string, AdminStatusInfo>) {
  return (status: string): AdminStatusInfo => config[status] ?? { label: status, color: "default" };
}

// DebtClaimStatus — Alle dossiers, detail van een dossier.
export const DEBT_CLAIM_ADMIN_STATUS: Record<string, AdminStatusInfo> = {
  OPEN: { label: "Open", color: "success" },
  IN_PROGRESS: { label: "In behandeling", color: "primary" },
  SETTLED: { label: "Vereffend", color: "info" },
  CLOSED: { label: "Gesloten", color: "default" },
  CANCELLED: { label: "Geannuleerd", color: "error" },
};
export const getDebtClaimAdminStatusInfo = makeLookup(DEBT_CLAIM_ADMIN_STATUS);

// AdministrativeCollectionStatus — AOP-register.
export const AOP_ADMIN_STATUS: Record<string, AdminStatusInfo> = {
  DRAFT: { label: "Concept", color: "default" },
  ACTIVE: { label: "Actief", color: "primary" },
  WAITING_RESPONSE: { label: "Wacht op reactie", color: "primary" },
  PAID: { label: "Betaald", color: "success" },
  DEFAULTED: { label: "In gebreke", color: "error" },
  BLOCKADE_CREATED: { label: "Blokkade geregistreerd", color: "error" },
  CANCELLED: { label: "Geannuleerd", color: "error" },
  CLOSED: { label: "Gesloten", color: "default" },
};
export const getAopAdminStatusInfo = makeLookup(AOP_ADMIN_STATUS);

// FinancialAgreementStatus — FAR-register.
export const FAR_ADMIN_STATUS: Record<string, AdminStatusInfo> = {
  PENDING_PAYMENT: { label: "Wacht op betaling", color: "primary" },
  REGISTERED: { label: "Geregistreerd", color: "success" },
  ESCALATED: { label: "Geëscaleerd", color: "error" },
  CANCELLED: { label: "Geannuleerd", color: "error" },
};
export const getFarAdminStatusInfo = makeLookup(FAR_ADMIN_STATUS);

// LegalProcessStatus — GOP-register.
export const GOP_ADMIN_STATUS: Record<string, AdminStatusInfo> = {
  GOP_DRAFT: { label: "Concept", color: "default" },
  GOP_ACTIVE: { label: "Actief", color: "primary" },
  GOP_INACTIVE: { label: "Inactief", color: "default" },
  CLOSED: { label: "Gesloten", color: "success" },
};
export const getGopAdminStatusInfo = makeLookup(GOP_ADMIN_STATUS);

// CollectiveCollectionStatus — COP-register.
export const COP_ADMIN_STATUS: Record<string, AdminStatusInfo> = {
  PENDING_PAYMENT: { label: "Wacht op betaling", color: "primary" },
  ACTIVE: { label: "Actief", color: "primary" },
  AWAITING_DEBTOR_RESPONSE: { label: "Wacht op debiteur", color: "primary" },
  PAYMENT_AGREEMENT_REQUESTED: { label: "Regeling aangevraagd", color: "primary" },
  PAYMENT_AGREEMENT_ACCEPTED: { label: "Regeling geaccepteerd", color: "success" },
  PAID_IN_FULL: { label: "Volledig betaald", color: "success" },
  TRANSFERRED: { label: "Overgedragen aan GOP", color: "info" },
  CLOSED: { label: "Gesloten", color: "default" },
};
export const getCopAdminStatusInfo = makeLookup(COP_ADMIN_STATUS);

// CaseTransferStatus — Dossieroverdrachten.
export const TRANSFER_ADMIN_STATUS: Record<string, AdminStatusInfo> = {
  PENDING_PAYMENT: { label: "Wacht op betaling", color: "default" },
  PENDING_ACCEPTANCE: { label: "In afwachting van acceptatie", color: "primary" },
  ACCEPTED: { label: "Overgedragen", color: "success" },
  REJECTED: { label: "Afgewezen", color: "error" },
  WORK_COMPLETED: { label: "Werk afgerond", color: "success" },
  CANCELLED: { label: "Geannuleerd", color: "error" },
};
export const getTransferAdminStatusInfo = makeLookup(TRANSFER_ADMIN_STATUS);

// ClaimCharge.status — Overtredingen/vergoedingen.
export const CHARGE_ADMIN_STATUS: Record<string, AdminStatusInfo> = {
  PENDING: { label: "In afwachting", color: "primary" },
  INVOICED: { label: "Gefactureerd", color: "info" },
  PAID: { label: "Betaald", color: "success" },
  WAIVED: { label: "Kwijtgescholden", color: "default" },
  CANCELLED: { label: "Geannuleerd", color: "error" },
};
export const getChargeAdminStatusInfo = makeLookup(CHARGE_ADMIN_STATUS);

// DebtClaimObligation.status — Financiële verplichtingen.
export const OBLIGATION_ADMIN_STATUS: Record<string, AdminStatusInfo> = {
  PENDING: { label: "In afwachting", color: "primary" },
  PARTIALLY_PAID: { label: "Gedeeltelijk betaald", color: "primary" },
  PAID: { label: "Betaald", color: "success" },
  CANCELLED: { label: "Geannuleerd", color: "error" },
};
export const getObligationAdminStatusInfo = makeLookup(OBLIGATION_ADMIN_STATUS);

// LawyerStatus / BailiffStatus — Advocaten, Deurwaarders.
export const PROFESSIONAL_ADMIN_STATUS: Record<string, AdminStatusInfo> = {
  ACTIVE: { label: "Actief", color: "success" },
  INACTIVE: { label: "Inactief", color: "default" },
  SUSPENDED: { label: "Geschorst", color: "error" },
};
export const getProfessionalAdminStatusInfo = makeLookup(PROFESSIONAL_ADMIN_STATUS);

// BlockadeStatus — BLK-register.
export const BLOCKADE_ADMIN_STATUS: Record<string, AdminStatusInfo> = {
  DRAFT: { label: "Concept", color: "default" },
  ACTIVE: { label: "Actief", color: "error" },
  SUSPENDED: { label: "Opgeschort", color: "primary" },
};
export const getBlockadeAdminStatusInfo = makeLookup(BLOCKADE_ADMIN_STATUS);

// COLNetworkQueryStatus — Werkgeverbevestigingen.
export const NETWORK_QUERY_ADMIN_STATUS: Record<string, AdminStatusInfo> = {
  OPEN: { label: "Open", color: "primary" },
  MATCHED: { label: "Werkgever gevonden", color: "success" },
  CLOSED_NO_MATCH: { label: "Geen match", color: "default" },
};
export const getNetworkQueryAdminStatusInfo = makeLookup(NETWORK_QUERY_ADMIN_STATUS);

// Payment.status ("paid" | "pending" | "failed") — Betalingen.
export const PAYMENT_ADMIN_STATUS: Record<string, AdminStatusInfo> = {
  paid: { label: "Betaald", color: "success" },
  pending: { label: "In behandeling", color: "primary" },
  failed: { label: "Mislukt", color: "error" },
};
export const getPaymentAdminStatusInfo = makeLookup(PAYMENT_ADMIN_STATUS);
