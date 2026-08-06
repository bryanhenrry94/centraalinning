import { CollectiveCollectionStatus } from "@prisma/client";

export { CollectiveCollectionStatus };

// Estados en los que el COP todavía puede avanzar (no está cerrado, pagado,
// aceptado o transferido).
export const OPEN_COLLECTIVE_COLLECTION_STATUSES: CollectiveCollectionStatus[] = [
  CollectiveCollectionStatus.ACTIVE,
  CollectiveCollectionStatus.AWAITING_DEBTOR_RESPONSE,
  CollectiveCollectionStatus.PAYMENT_AGREEMENT_REQUESTED,
];

// Estados finales — el COP ya no puede volver a abrirse ni cambiar de rumbo.
export const TERMINAL_COLLECTIVE_COLLECTION_STATUSES: CollectiveCollectionStatus[] = [
  CollectiveCollectionStatus.PAYMENT_AGREEMENT_ACCEPTED,
  CollectiveCollectionStatus.PAID_IN_FULL,
  CollectiveCollectionStatus.TRANSFERRED,
  CollectiveCollectionStatus.CLOSED,
];
