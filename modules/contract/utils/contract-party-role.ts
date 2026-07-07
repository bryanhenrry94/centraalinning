import { ContractPartyRole } from "@prisma/client";

export function getContractPartyRoleLabel(role: ContractPartyRole): string {
  switch (role) {
    case "PARTY_A":
      return "Crediteur";

    case "PARTY_B":
      return "Debiteur";

    default:
      return role;
  }
}
