import { FinancialAgreementStatus } from "@prisma/client";

export { FinancialAgreementStatus };

type StatusColor = "default" | "info" | "warning" | "success" | "error";

const FINANCIAL_AGREEMENT_STATUS_CONFIG: Record<string, { label: string; color: StatusColor }> = {
  PENDING_PAYMENT: { label: "Wacht op betaling", color: "default" },
  REGISTERED: { label: "Geregistreerd", color: "success" },
  ESCALATED: { label: "Geëscaleerd naar AOP", color: "warning" },
  CANCELLED: { label: "Geannuleerd", color: "error" },
};

export function getFinancialAgreementStatusInfo(status: string) {
  return (
    FINANCIAL_AGREEMENT_STATUS_CONFIG[status] ?? {
      label: status,
      color: "default" as StatusColor,
    }
  );
}
