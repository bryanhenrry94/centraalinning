import { CollectiveCollectionStatus } from "@/modules/collective-follow-up/constants/collective-collection-status";
import { STATUS_HEX } from "@/shared/constants/status-colors";

// Paleta CFSB aprobada (zie shared/constants/status-colors.ts): blauw =
// lopend/in afwachting, oranje = aandacht/actie vereist, groen = afgerond/
// betaald, grijs = overgedragen/afgesloten zonder volledige betaling.
const COLLECTIVE_COLLECTION_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING_PAYMENT: { label: "Wacht op betaling", color: STATUS_HEX.blue },
  ACTIVE: { label: "COP actief", color: STATUS_HEX.blue },
  AWAITING_DEBTOR_RESPONSE: { label: "Wacht op reactie debiteur", color: STATUS_HEX.blue },
  PAYMENT_AGREEMENT_REQUESTED: {
    label: "Betalingsregeling aangevraagd",
    color: STATUS_HEX.orange,
  },
  PAYMENT_AGREEMENT_ACCEPTED: {
    label: "Betalingsregeling actief",
    color: STATUS_HEX.blue,
  },
  PAID_IN_FULL: { label: "Volledig betaald", color: STATUS_HEX.green },
  // Geen "GOP" hier — een GOP bestaat pas zodra een vonnis geregistreerd
  // wordt (zie CaseTransferService); vlak na de overdracht is er alleen een
  // CaseTransfer, nog geen LegalProcess (feedback sponsor, punt 10).
  TRANSFERRED: { label: "Overgedragen aan advocaat/deurwaarder", color: STATUS_HEX.grey },
  CLOSED: { label: "Afgesloten", color: STATUS_HEX.grey },
};

export function getCollectiveCollectionStatusInfo(status: string) {
  return (
    COLLECTIVE_COLLECTION_STATUS_CONFIG[status] ?? {
      label: status,
      color: STATUS_HEX.grey,
    }
  );
}

export { CollectiveCollectionStatus };
