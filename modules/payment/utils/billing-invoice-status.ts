export type ChipColor = "default" | "primary" | "warning" | "info" | "error" | "success";

// BillingInvoice.status is een vrij String in het schema (geen enum) — in de
// praktijk komen zowel "unpaid"/"paid"/"overdue" (BillingInvoiceService) als
// het historische "ISSUED" (InvoiceService, vóór de fix) voor. Deze lookup
// normaliseert dat naar één consequente Nederlandse label/kleur per status.
// CCP: geel/amber = in afwachting (incl. "openstaand" — wacht op betaling);
// groen = betaald; rood = vervallen/kritieke waarschuwing.
export const BILLING_INVOICE_STATUS_CONFIG: Record<string, { label: string; color: ChipColor }> = {
  PAID: { label: "Betaald", color: "success" },
  UNPAID: { label: "Openstaand", color: "warning" },
  ISSUED: { label: "Openstaand", color: "warning" },
  OVERDUE: { label: "Vervallen", color: "error" },
};

export function getBillingInvoiceStatusInfo(status: string) {
  return (
    BILLING_INVOICE_STATUS_CONFIG[status.toUpperCase()] ?? { label: status, color: "default" as ChipColor }
  );
}
