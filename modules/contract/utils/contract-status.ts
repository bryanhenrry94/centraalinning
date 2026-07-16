import { ChipProps } from "@mui/material";
import { ContractStatus } from "@prisma/client";

export function getContractStatusLabel(status: ContractStatus): string {
  switch (status) {
    case "DRAFT":
      return "Concept";

    case "REGISTERED":
      return "Geregistreerd";

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

    case "REGISTERED":
      return "info";

    default:
      return "default";
  }
}
