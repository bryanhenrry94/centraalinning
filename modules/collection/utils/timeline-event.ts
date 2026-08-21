const TIMELINE_EVENT_LABELS: Record<string, string> = {
  // GENERAL
  CLAIM_CREATED: "Dossier aangemaakt",
  CLAIM_UPDATED: "Dossier bijgewerkt",
  CLAIM_CLOSED: "Dossier gesloten",
  CLAIM_CANCELLED: "Dossier geannuleerd",

  // BLC
  BLOCK_CHECK_PERFORMED: "Blok-Check uitgevoerd",

  // FAR
  FAR_REGISTERED: "Financiële afspraak geregistreerd",
  FAR_COMPLETED: "Financiële afspraak afgerond",

  // AOP
  AOP_STARTED: "Administratieve opvolging gestart",
  AOP_STEP_COMPLETED: "AOP-stap afgerond",
  AOP_COMPLETED: "Administratieve opvolging afgerond",

  // BLK
  BLOCKADE_REGISTERED: "Blokkade geregistreerd",
  BLOCKADE_RELEASED: "Blokkade opgeheven",

  // COP
  COL_STARTED: "Collectieve opvolging gestart",
  COL_DEBTOR_NOTIFIED: "Debiteur geïnformeerd",
  COL_NETWORK_BROADCAST_SENT: "Netwerkvraag verzonden",
  COL_EMPLOYER_FOUND: "Werkgever gevonden",
  COL_NEGOTIATION_CREATED: "Onderhandeling gestart",
  COL_NEGOTIATION_ACCEPTED: "Onderhandeling geaccepteerd",
  COL_NEGOTIATION_REJECTED: "Onderhandeling afgewezen",
  COL_TRANSFERRED_TO_GOP: "Overgedragen aan gerechtelijke opvolging",
  COL_CLOSED: "Collectieve opvolging gesloten",
  COL_COMPLETED: "Collectieve opvolging afgerond",

  // PAYMENTS
  PAYMENT_REGISTERED: "Betaling geregistreerd",
  PAYMENT_VERIFIED: "Betaling geverifieerd",
  PAYMENT_REJECTED: "Betaling afgewezen",

  // AGREEMENTS
  AGREEMENT_CREATED: "Betalingsregeling aangemaakt",
  AGREEMENT_SIGNED: "Betalingsregeling ondertekend",
  AGREEMENT_BREACHED: "Betalingsregeling niet nagekomen",
  AGREEMENT_COMPLETED: "Betalingsregeling afgerond",

  // GOP
  GOP_STARTED: "Dossier overgedragen",
  LAWYER_ASSIGNED: "Advocaat toegewezen",
  BAILIFF_ASSIGNED: "Deurwaarder toegewezen",
  VERDICT_REGISTERED: "Vonnis geregistreerd",
  GOP_COMPLETED: "GOP afgerond",

  // DOCUMENTS
  DOCUMENT_UPLOADED: "Document geüpload",
  DOCUMENT_UPDATED: "Document bijgewerkt",
  DOCUMENT_DELETED: "Document verwijderd",

  // NOTIFICATIONS
  NOTIFICATION_SENT: "Melding verzonden",
  NOTIFICATION_DELIVERED: "Melding afgeleverd",
  NOTIFICATION_FAILED: "Melding mislukt",

  // SYSTEM
  STATUS_CHANGED: "Status gewijzigd",
  SERVICE_STARTED: "Dienst gestart",
  SERVICE_COMPLETED: "Dienst afgerond",
};

export function getTimelineEventLabel(event: string): string {
  return TIMELINE_EVENT_LABELS[event] ?? event;
}
