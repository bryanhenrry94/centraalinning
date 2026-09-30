// Etiquet voor CFSB Admin > CFSB-kosten — ClaimCharge.concept wordt bij
// aanmaak in modules/collection/services/collection.service.ts nog als losse
// Spaanse/onvertaalde string opgeslagen ("Honorarios de cobranza", "ABB
// (belasting)", "Digitaal dossier"). De onderliggende waarde blijft zo,
// omdat collection-mail.service.tsx er exact op matcht om de AOP-mails op te
// bouwen — hier vertalen we alleen voor de weergave op dit scherm (sponsor
// feedback 2026-09-29, zelfde aanpak als admin-payment-labels.ts).
const CONCEPT_LABELS: Record<string, string> = {
  "Honorarios de cobranza": "AOP-kosten",
  "Digitaal dossier": "Dossierregistratie",
};

// ABB is een percentage van de AOP-kosten, geconfigureerd per tenant/
// rechtsgebied (Parameter.abb_rate) — nooit vast op 6%, dus tonen we het
// percentage dat effectief op déze kost is toegepast (ClaimCharge.percentage)
// i.p.v. dat te hardcoden.
export function getClaimChargeConceptLabel(
  concept: string,
  percentage?: number | null,
): string {
  if (concept === "ABB (belasting)") {
    return percentage != null ? `ABB ${percentage}%` : "ABB";
  }
  return CONCEPT_LABELS[concept] ?? concept;
}
