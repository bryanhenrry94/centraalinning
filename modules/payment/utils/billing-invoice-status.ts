export type ChipColor = "default" | "primary" | "warning" | "info" | "error" | "success";

// BillingInvoice.status is een vrij String in het schema (geen enum) — in de
// praktijk komen zowel "unpaid"/"paid"/"overdue" (BillingInvoiceService) als
// het historische "ISSUED" (InvoiceService, vóór de fix) voor. Deze lookup
// normaliseert dat naar één consequente Nederlandse label/kleur per status.
export const BILLING_INVOICE_STATUS_CONFIG: Record<string, { label: string; color: ChipColor }> = {
  PAID: { label: "Betaald", color: "success" },
  UNPAID: { label: "Openstaand", color: "info" },
  ISSUED: { label: "Openstaand", color: "info" },
  OVERDUE: { label: "Vervallen", color: "error" },
};

export function getBillingInvoiceStatusInfo(status: string) {
  return (
    BILLING_INVOICE_STATUS_CONFIG[status.toUpperCase()] ?? { label: status, color: "default" as ChipColor }
  );
}
