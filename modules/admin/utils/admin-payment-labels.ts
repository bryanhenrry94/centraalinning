// Etiquetas legibles para CFSB Admin > Betalingen — payment_type/method
// llegan como códigos crudos de Payment (PaymentType, PaymentMethod), acá
// solo se traducen para mostrar, no cambia nada de la lógica de pago.
const PAYMENT_TYPE_LABELS: Record<string, string> = {
  SUBSCRIPTION: "Abonnement",
  CONTRACT_ACTIVATION: "Contractactivering",
  AGREEMENT_INSTALLMENT: "Betalingsregeling termijn",
  DEBT_PAYMENT: "Schuldbetaling",
  BLOK_CHECK: "BLC",
  FINANCIAL_REPORT: "Financieel verslag",
  // "Incassokosten" paste niet bij de CFSB-terminologie (feedback sponsor) —
  // dit is de AOP-registratiekosten (collection-form.tsx), dus consequent
  // met de andere service-codes hieronder.
  COLLECTION: "AOP-kosten",
  GOP: "GOP-kosten",
  GOP_ACTIVATION: "GOP-activering",
  GOP_BAILIFF_REFERRAL: "GOP-deurwaarder-doorverwijzingstarief",
  GOP_TRANSFER: "GOP-overdracht",
  GOP_LAWYER_FEE: "GOP-advocaatkosten",
  GOP_BAILIFF_FEE: "GOP-deurwaarderskosten",
  FAR_REGISTRATION: "FAR",
  COP_START: "COP-kosten",
  DEBTOR_COLLECTION_FEE: "CFSB-kosten",
  OTHER: "Overig",
};

export function getPaymentTypeLabel(type: string): string {
  return PAYMENT_TYPE_LABELS[type] ?? type;
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  TRANSFER: "Bankoverschrijving",
  CREDIT_CARD: "Creditcard",
};

export function getPaymentMethodLabel(method: string): string {
  return PAYMENT_METHOD_LABELS[method] ?? method;
}
