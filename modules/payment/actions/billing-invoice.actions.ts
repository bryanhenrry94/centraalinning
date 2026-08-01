"use server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  BillingInvoiceBase,
  BillingInvoiceCreate,
  BillingInvoiceResponse,
} from "@/modules/payment/services/billing-invoice.validators";
import { InvoicePDFProps } from "@/modules/payment/templates/pdfs/InvoicePDF";
import { ActivationInvoiceInput } from "@/modules/payment/services/invoice.type";
import { BillingInvoiceService } from "@/modules/payment/services/billing-invoice.service";
import { LegalProcessService } from "@/modules/legal-process/services/legal-process.service";

export const createCollectionInvoice = async (params: ActivationInvoiceInput) => {
  return BillingInvoiceService.createCollectionInvoice(params);
};

export const generateInvoiceNumber = async (): Promise<string> => {
  return BillingInvoiceService.generateInvoiceNumber();
};

export const getDataInvoicePDF = async (id: string): Promise<InvoicePDFProps> => {
  return BillingInvoiceService.getDataInvoicePDF(id);
};

export const getAllInvoices = async (): Promise<BillingInvoiceResponse[]> => {
  try {
    return BillingInvoiceService.getAll();
  } catch {
    throw new Error("Error fetching invoices");
  }
};

// Las facturas GOP (honorarios del 5%) del alguacil, escopeadas a los
// expedientes que tiene asignados — no a la facturación completa del tenant.
export const getMyGopInvoicesAsBailiff = async (): Promise<BillingInvoiceResponse[]> => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("U bent niet ingelogd.");

  const legalProcesses = await LegalProcessService.getForBailiffUser(session.user.id);
  const debtClaimIds = legalProcesses.map((lp) => lp.debtClaimId);

  return BillingInvoiceService.getForDebtClaimIds(debtClaimIds);
};

export const getInvoiceById = async (id: string): Promise<BillingInvoiceBase | null> => {
  try {
    return BillingInvoiceService.getById(id);
  } catch {
    throw new Error("Error fetching invoice");
  }
};

export const createInvoice = async (
  invoice: BillingInvoiceCreate,
  tenant_id: string,
): Promise<BillingInvoiceBase> => {
  try {
    return BillingInvoiceService.create(invoice, tenant_id);
  } catch (error) {
    console.error("Error creating invoice:", error);
    throw new Error("Error creating invoice");
  }
};

export const updateInvoice = async (
  id: string,
  invoice: Partial<BillingInvoiceCreate>,
): Promise<boolean> => {
  try {
    return BillingInvoiceService.update(id, invoice);
  } catch {
    throw new Error("Error updating invoice");
  }
};

export const deleteInvoice = async (id: string): Promise<boolean> => {
  try {
    return BillingInvoiceService.delete(id);
  } catch {
    throw new Error("Error deleting invoice");
  }
};

export const getNextInvoiceNumber = async (tenant_id: string): Promise<string> => {
  try {
    return BillingInvoiceService.getNextInvoiceNumber(tenant_id);
  } catch {
    throw new Error("Error generating next invoice number");
  }
};
