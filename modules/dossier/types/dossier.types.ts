import { DebtClaimResponse } from "@/modules/collection/services/collection.type";

// Seis diensten CFSB: FAR/BLC son pre-claim (nog geen DebtClaim); AOP/COP/GOP
// zijn opeenvolgende fases van hetzelfde DebtClaim (zie CLAUDE.md); BLK is
// pre-claim ALLEEN wanneer rechtstreeks geregistreerd (geen originDebtClaimId)
// — anders is het al zichtbaar als AOP-fase van zijn DebtClaim-rij.
export type DossierServiceType = "FAR" | "BLC" | "AOP" | "BLK" | "COP" | "GOP";

export interface DossierRow {
  id: string;
  serviceType: DossierServiceType;
  date: Date;
  reference: string;
  debtorName: string;
  claimed?: number;
  paid?: number;
  outstanding?: number;
  statusLabel: string;
  statusColor: string;
  detailHref: string;
  // Alleen aanwezig voor serviceType AOP/COP/GOP — de rij-actiemenu
  // (DebtClaimActionsMenu) hergebruikt de volledige DebtClaimResponse.
  debtClaim?: DebtClaimResponse;
  // Alleen aanwezig voor serviceType FAR.
  financialAgreementId?: string;
  farEligibleForFollowUp?: boolean;
}
