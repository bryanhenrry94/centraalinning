// Etiquetas/colores de Chip para las pantallas de CFSB Admin (listados
// cross-tenant). A propósito NO reutiliza los *_STATUS_CONFIG de cada
// módulo de negocio (modules/collection/utils/debt-claim-status.ts,
// modules/legal-process/utils/case-transfer-status.ts, etc.) — esas
// pantallas de deelnemer/abogado/alguacil tienen su propio criterio de
// etiqueta, pero el COLOR debe significar lo mismo en todas partes.
//
// CCP-kleurenregel (reemplaza la vieja convención "nada de warning" —
// superada por el acuerdo CCP vigente con el sponsor):
//   warning (geel/amber) — in afwachting, concept of lopend proces
//   success (groen)      — actief, geaccepteerd, betaald of succesvol afgerond
//   error (rood)         — blokkade, afwijzing, fout of kritieke waarschuwing
//   info (lichtblauw)    — neutrale informatie / rustige systeemstatus
//   default (grijs)      — secundaire info, niet-actief, vrijwillig geannuleerd
//   primary (oranje)     — NIET voor statuslabels; oranje is voor primaire
//                          actieknoppen (Starten, Verzenden, Registreren) —
//                          hier niet meer gebruikt.
// Dezelfde kleur moet overal dezelfde betekenis houden — zelfde status, zelfde
// kleur als de corresponderende *_STATUS_CONFIG van het business-module.
export type AdminChipColor =
  | "default"
  | "primary"
  | "warning"
  | "info"
  | "error"
  | "success";

export type AdminStatusInfo = { label: string; color: AdminChipColor };

function makeLookup(config: Record<string, AdminStatusInfo>) {
  return (status: string): AdminStatusInfo =>
    config[status] ?? { label: status, color: "default" };
}

// DebtClaimStatus — Alle dossiers, detail van een dossier.
export const DEBT_CLAIM_ADMIN_STATUS: Record<string, AdminStatusInfo> = {
  OPEN: { label: "Open", color: "warning" },
  IN_PROGRESS: { label: "In behandeling", color: "warning" },
  SETTLED: { label: "Vereffend", color: "success" },
  CLOSED: { label: "Gesloten", color: "default" },
  CANCELLED: { label: "Geannuleerd", color: "default" },
};
export const getDebtClaimAdminStatusInfo = makeLookup(DEBT_CLAIM_ADMIN_STATUS);

// AdministrativeCollectionStatus — AOP-register.
export const AOP_ADMIN_STATUS: Record<string, AdminStatusInfo> = {
  DRAFT: { label: "Concept", color: "default" },
  ACTIVE: { label: "Actief", color: "success" },
  WAITING_RESPONSE: { label: "Wacht op reactie", color: "warning" },
  PAID: { label: "Betaald", color: "success" },
  DEFAULTED: { label: "In gebreke", color: "error" },
  BLOCKADE_CREATED: { label: "Blokkade geregistreerd", color: "error" },
  CANCELLED: { label: "Geannuleerd", color: "default" },
  CLOSED: { label: "Gesloten", color: "default" },
};
export const getAopAdminStatusInfo = makeLookup(AOP_ADMIN_STATUS);

// FinancialAgreementStatus — FAR-register.
export const FAR_ADMIN_STATUS: Record<string, AdminStatusInfo> = {
  PENDING_PAYMENT: { label: "Wacht op betaling", color: "warning" },
  REGISTERED: { label: "Geregistreerd", color: "success" },
  ESCALATED: { label: "Geëscaleerd", color: "warning" },
  CANCELLED: { label: "Geannuleerd", color: "default" },
};
export const getFarAdminStatusInfo = makeLookup(FAR_ADMIN_STATUS);

// LegalProcessStatus — GOP-register.
export const GOP_ADMIN_STATUS: Record<string, AdminStatusInfo> = {
  GOP_DRAFT: { label: "Conceptregistratie", color: "warning" },
  GOP_ACTIVE: { label: "GOP Actief", color: "success" },
  GOP_INACTIVE: { label: "Inactief", color: "warning" },
  CLOSED: { label: "Gesloten", color: "success" },
};
export const getGopAdminStatusInfo = makeLookup(GOP_ADMIN_STATUS);

// CollectiveCollectionStatus — COP-register.
export const COP_ADMIN_STATUS: Record<string, AdminStatusInfo> = {
  PENDING_PAYMENT: { label: "Wacht op betaling", color: "warning" },
  ACTIVE: { label: "Actief", color: "success" },
  AWAITING_DEBTOR_RESPONSE: { label: "Wacht op debiteur", color: "warning" },
  PAYMENT_AGREEMENT_REQUESTED: {
    label: "Regeling aangevraagd",
    color: "warning",
  },
  PAYMENT_AGREEMENT_ACCEPTED: {
    label: "Regeling geaccepteerd",
    color: "success",
  },
  PAID_IN_FULL: { label: "Volledig betaald", color: "success" },
  TRANSFERRED: { label: "Overgedragen aan GOP", color: "info" },
  CLOSED: { label: "Gesloten", color: "default" },
};
export const getCopAdminStatusInfo = makeLookup(COP_ADMIN_STATUS);

// CaseTransferStatus — Dossieroverdrachten.
export const TRANSFER_ADMIN_STATUS: Record<string, AdminStatusInfo> = {
  PENDING_PAYMENT: { label: "Wacht op betaling", color: "warning" },
  PENDING_ACCEPTANCE: {
    label: "In afwachting van acceptatie",
    color: "warning",
  },
  ACCEPTED: { label: "Overgedragen", color: "success" },
  REJECTED: { label: "Afgewezen", color: "error" },
  WORK_COMPLETED: { label: "Werk afgerond", color: "success" },
  CANCELLED: { label: "Geannuleerd", color: "default" },
};
export const getTransferAdminStatusInfo = makeLookup(TRANSFER_ADMIN_STATUS);

// ClaimCharge.status — CFSB-kosten. "Openstaand" = wacht op betaling (CCP:
// geel/amber) — vervangt de oude sponsor-regel die hier bewust "primary"
// gebruikte (zie geschiedenis), nu uitgelijnd met CHARGE_STATUS_CONFIG.
export const CHARGE_ADMIN_STATUS: Record<string, AdminStatusInfo> = {
  PENDING: { label: "Openstaand", color: "warning" },
  INVOICED: { label: "Gefactureerd", color: "info" },
  PAID: { label: "Betaald", color: "success" },
  WAIVED: { label: "Kwijtgescholden", color: "default" },
  CANCELLED: { label: "Geannuleerd", color: "default" },
};
export const getChargeAdminStatusInfo = makeLookup(CHARGE_ADMIN_STATUS);

// DebtClaimObligation.status — Financiële verplichtingen.
export const OBLIGATION_ADMIN_STATUS: Record<string, AdminStatusInfo> = {
  PENDING: { label: "Openstaand", color: "warning" },
  PARTIALLY_PAID: { label: "Gedeeltelijk betaald", color: "warning" },
  PAID: { label: "Betaald", color: "success" },
  CANCELLED: { label: "Geannuleerd", color: "default" },
};
export const getObligationAdminStatusInfo = makeLookup(OBLIGATION_ADMIN_STATUS);

// LawyerStatus / BailiffStatus — Advocaten, Deurwaarders.
export const PROFESSIONAL_ADMIN_STATUS: Record<string, AdminStatusInfo> = {
  ACTIVE: { label: "Actief", color: "success" },
  INACTIVE: { label: "Inactief", color: "default" },
  SUSPENDED: { label: "Geschorst", color: "error" },
};
export const getProfessionalAdminStatusInfo = makeLookup(
  PROFESSIONAL_ADMIN_STATUS,
);

// BlockadeStatus — BLK-register. ACTIVE blijft rood: "blokkade" staat
// letterlijk in de CCP-definitie van rood, ook al is de blokkade zelf
// "actief" (dat zou anders groen zijn) — de blokkerende aard overstemt dat.
export const BLOCKADE_ADMIN_STATUS: Record<string, AdminStatusInfo> = {
  DRAFT: { label: "Concept", color: "default" },
  ACTIVE: { label: "Actief", color: "error" },
  SUSPENDED: { label: "Opgeschort", color: "warning" },
};
export const getBlockadeAdminStatusInfo = makeLookup(BLOCKADE_ADMIN_STATUS);

// COLNetworkQueryStatus — Werkgeverbevestigingen.
export const NETWORK_QUERY_ADMIN_STATUS: Record<string, AdminStatusInfo> = {
  OPEN: { label: "Open", color: "warning" },
  MATCHED: { label: "Werkgever gevonden", color: "success" },
  CLOSED_NO_MATCH: { label: "Geen match", color: "default" },
};
export const getNetworkQueryAdminStatusInfo = makeLookup(
  NETWORK_QUERY_ADMIN_STATUS,
);

// Payment.status ("paid" | "pending" | "failed") — Betalingen.
export const PAYMENT_ADMIN_STATUS: Record<string, AdminStatusInfo> = {
  paid: { label: "Betaald", color: "success" },
  pending: { label: "In behandeling", color: "warning" },
  failed: { label: "Mislukt", color: "error" },
};

// "Mislukt" past bij een automatische kaart-/online betaling (Sentoo wijst
// de transactie af) — bij een handmatige TRANSFER (Bankoverschrijving) is er
// geen "mislukking", enkel geld dat (nog) niet ontvangen is: dat is "in
// afwachting" (CCP: geel/amber), geen fout (rood).
export function getPaymentAdminStatusInfo(status: string, method?: string): AdminStatusInfo {
  if (status === "failed" && method === "TRANSFER") {
    return { label: "Niet ontvangen", color: "warning" };
  }
  return PAYMENT_ADMIN_STATUS[status] ?? { label: status, color: "default" };
}
