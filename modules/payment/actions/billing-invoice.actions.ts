"use server";
import {
  BillingInvoiceBase,
  BillingInvoiceCreate,
  BillingInvoiceResponse,
} from "@/modules/payment/services/billing-invoice.validators";
import { InvoicePDFProps } from "@/modules/payment/templates/pdfs/InvoicePDF";
import { ActivationInvoiceInput } from "@/modules/payment/services/invoice.type";
import { BillingInvoiceService } from "@/modules/payment/services/billing-invoice.service";

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
