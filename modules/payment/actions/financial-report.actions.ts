"use server";
import { FinancialReportService } from "@/modules/payment/services/financial-report.service";

export const createFinancialReportRequest = async ({
  tenant_id,
  person_id,
  payment_id,
  amount,
}: {
  tenant_id: string;
  person_id: string;
  payment_id: string;
  amount: number;
}) => {
  return FinancialReportService.create({ tenant_id, person_id, payment_id, amount });
};
