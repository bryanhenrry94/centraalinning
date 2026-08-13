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
    return await BillingInvoiceService.getAll();
  } catch {
    throw new Error("Fout bij het ophalen van facturen");
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
    return await BillingInvoiceService.getById(id);
  } catch {
    throw new Error("Fout bij het ophalen van de factuur");
  }
};

export const createInvoice = async (
  invoice: BillingInvoiceCreate,
  tenant_id: string,
): Promise<BillingInvoiceBase> => {
  try {
    return await BillingInvoiceService.create(invoice, tenant_id);
  } catch (error) {
    console.error("Error creating invoice:", error);
    throw new Error("Fout bij het aanmaken van de factuur");
  }
};

export const updateInvoice = async (
  id: string,
  invoice: Partial<BillingInvoiceCreate>,
): Promise<boolean> => {
  try {
    return await BillingInvoiceService.update(id, invoice);
  } catch {
    throw new Error("Fout bij het bijwerken van de factuur");
  }
};

export const deleteInvoice = async (id: string): Promise<boolean> => {
  try {
    return await BillingInvoiceService.delete(id);
  } catch {
    throw new Error("Fout bij het verwijderen van de factuur");
  }
};

export const getNextInvoiceNumber = async (tenant_id: string): Promise<string> => {
  try {
    return await BillingInvoiceService.getNextInvoiceNumber(tenant_id);
  } catch {
    throw new Error("Fout bij het genereren van het volgende factuurnummer");
  }
};
