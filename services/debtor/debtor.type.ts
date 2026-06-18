import { z } from "zod";
import {
  DebtorIncomeSchema,
  DebtorIncomeCreateSchema,
  DebtorSummarySchema,
  DebtorSchema,
  DebtorCreateSchema,
  DebtorResponseSchema,
} from "@/services/debtor/debtor.validators";

export type DebtorSummary = z.infer<typeof DebtorSummarySchema>;
export type DebtorInput = z.infer<typeof DebtorSchema>;
export type DebtorCreate = z.infer<typeof DebtorCreateSchema>;
export type DebtorResponse = z.infer<typeof DebtorResponseSchema>;
export type DebtorIncomeInput = z.infer<typeof DebtorIncomeSchema>;
export type DebtorIncomeCreate = z.infer<typeof DebtorIncomeCreateSchema>;

export interface DebtorSearchParams {
  q?: string;
  page: number;
  pageSize: number;
}

export interface DebtorPickerResponse {
  data: DebtorResponse[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}
