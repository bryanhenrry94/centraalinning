import { z } from "zod";
import {
  DebtClaimSchema,
  DebtClaimCreateSchema,
  DebtClaimUpdateSchema,
  DebtClaimResponseSchema,
} from "@/modules/collection/services/collection.validators";

export type DebtClaimFilter = {
  tenantId: string;
  status?: "OPEN" | "IN_PROGRESS" | "SETTLED" | "CLOSED" | "CANCELLED";
  debtorId?: string;
};

export type DebtClaim = z.infer<typeof DebtClaimSchema>;
export type DebtClaimCreate = z.infer<typeof DebtClaimCreateSchema>;
export type DebtClaimUpdate = z.infer<typeof DebtClaimUpdateSchema>;
export type DebtClaimResponse = z.infer<typeof DebtClaimResponseSchema>;
