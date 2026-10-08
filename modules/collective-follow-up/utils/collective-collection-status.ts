import { CollectiveCollectionStatus } from "@/modules/collective-follow-up/constants/collective-collection-status";

type StatusColor = "default" | "info" | "warning" | "success" | "error";

// CCP-kleurenregel: groen = actief/geaccepteerd/betaald; geel/amber = wacht
// op/lopend proces; rood = afwijzing/fout/blokkade (niet: "afgesloten zonder
// volledige betaling", dat is neutraal → grijs, geen fout).
const COLLECTIVE_COLLECTION_STATUS_CONFIG: Record<string, { label: string; color: StatusColor }> = {
  ACTIVE: { label: "COP actief", color: "success" },
  AWAITING_DEBTOR_RESPONSE: { label: "Wacht op reactie debiteur", color: "warning" },
  PAYMENT_AGREEMENT_REQUESTED: { label: "Betalingsregeling aangevraagd", color: "warning" },
  PAYMENT_AGREEMENT_ACCEPTED: { label: "Betalingsregeling geaccepteerd", color: "success" },
  PAID_IN_FULL: { label: "Volledig betaald", color: "success" },
  // Geen "GOP" hier — een GOP bestaat pas zodra een vonnis geregistreerd
  // wordt (zie CaseTransferService); vlak na de overdracht is er alleen een
  // CaseTransfer, nog geen LegalProcess (feedback sponsor, punt 10).
  TRANSFERRED: { label: "Overgedragen aan advocaat/deurwaarder", color: "info" },
  CLOSED: { label: "Afgesloten", color: "default" },
};

export function getCollectiveCollectionStatusInfo(status: string) {
  return (
    COLLECTIVE_COLLECTION_STATUS_CONFIG[status] ?? {
      label: status,
      color: "default" as StatusColor,
    }
  );
}

export { CollectiveCollectionStatus };
