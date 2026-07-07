import { ChipProps } from "@mui/material";
import { ContractStatus } from "@prisma/client";

export function getContractStatusLabel(status: ContractStatus): string {
  switch (status) {
    case "DRAFT":
      return "Concept";

    case "PENDING_PAYMENT":
      return "Betaling in behandeling";

    case "REGISTERED":
      return "Geregistreerd";

    case "IN_COLLECTION":
      return "In incasso";

    case "CANCELLED":
      return "Geannuleerd";

    default:
      return status;
  }
}

export function getContractStatusColor(
  status: ContractStatus,
): ChipProps["color"] {
  switch (status) {
    case "DRAFT":
      return "default";

    case "PENDING_PAYMENT":
      return "warning";

    case "REGISTERED":
      return "info";

    case "IN_COLLECTION":
      return "error";

    case "CANCELLED":
      return "error";

    default:
      return "default";
  }
}
