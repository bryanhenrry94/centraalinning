import { CollectiveCollectionStatus } from "@/modules/collective-follow-up/constants/collective-collection-status";

type StatusColor = "default" | "info" | "warning" | "success" | "error";

const COLLECTIVE_COLLECTION_STATUS_CONFIG: Record<string, { label: string; color: StatusColor }> = {
  ACTIVE: { label: "COP actief", color: "info" },
  AWAITING_DEBTOR_RESPONSE: { label: "Wacht op reactie debiteur", color: "default" },
  PAYMENT_AGREEMENT_REQUESTED: { label: "Betalingsregeling aangevraagd", color: "warning" },
  PAYMENT_AGREEMENT_ACCEPTED: { label: "Betalingsregeling geaccepteerd", color: "success" },
  PAID_IN_FULL: { label: "Volledig betaald", color: "success" },
  TRANSFERRED: { label: "Overgedragen aan GOP", color: "info" },
  CLOSED: { label: "Afgesloten", color: "error" },
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
