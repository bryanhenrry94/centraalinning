import { CollectiveCollectionStatus } from "@prisma/client";

export { CollectiveCollectionStatus };

// Comisión CFSB por iniciar un COP, a cargo del participante que lo inicia
// (mismo patrón de tasa fija que GOP_FEE_RATE en legal-process-status.ts).
export const COP_START_FEE_RATE = 0.05;

// Estados en los que el COP todavía puede avanzar (no está cerrado, pagado,
// aceptado o transferido).
export const OPEN_COLLECTIVE_COLLECTION_STATUSES: CollectiveCollectionStatus[] = [
  CollectiveCollectionStatus.ACTIVE,
  CollectiveCollectionStatus.AWAITING_DEBTOR_RESPONSE,
  CollectiveCollectionStatus.PAYMENT_AGREEMENT_REQUESTED,
];

// Estados finales — el COP ya no puede volver a abrirse (geen betalingsregeling
// meer aanvragen/beoordelen, geen "actief houden"). CLOSED is de uitzondering:
// dat betekent alleen dat de actieve COP-opvolging stopte zonder oplossing —
// de enige nog beschikbare vervolgstap is overdragen aan een advocaat/deurwaarder
// (feedback sponsor, sectie 9). Zie TRANSFERABLE_COLLECTIVE_COLLECTION_STATUSES.
export const TERMINAL_COLLECTIVE_COLLECTION_STATUSES: CollectiveCollectionStatus[] = [
  CollectiveCollectionStatus.PAYMENT_AGREEMENT_ACCEPTED,
  CollectiveCollectionStatus.PAID_IN_FULL,
  CollectiveCollectionStatus.TRANSFERRED,
  CollectiveCollectionStatus.CLOSED,
];

// Estados vanuit welke het dossier nog overgedragen kan worden aan een
// advocaat/deurwaarder: terwijl het COP nog open is (rechtstreeks in plaats
// van te sluiten), of net nadat het zonder oplossing gesloten is (de
// gebruikelijke weg — zie CollectiveCollectionService.transferToGop).
export const TRANSFERABLE_COLLECTIVE_COLLECTION_STATUSES: CollectiveCollectionStatus[] = [
  ...OPEN_COLLECTIVE_COLLECTION_STATUSES,
  CollectiveCollectionStatus.CLOSED,
];
