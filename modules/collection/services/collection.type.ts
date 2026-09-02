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
  // BLK (y otros servicios) usan DebtClaim como registro compartido, pero
  // no pertenecen al listado de AOP (seguimiento administrativo) — la
  // página de AOP filtra explícitamente ese origen con esto.
  excludeOrigin?: ("FAR" | "MANUAL" | "IMPORT" | "API" | "BLK")[];
};

export type DebtClaim = z.infer<typeof DebtClaimSchema>;
export type DebtClaimCreate = z.infer<typeof DebtClaimCreateSchema>;
export type DebtClaimUpdate = z.infer<typeof DebtClaimUpdateSchema>;
export type DebtClaimResponse = z.infer<typeof DebtClaimResponseSchema>;
