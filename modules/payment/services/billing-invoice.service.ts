import { prisma } from "@/lib/prisma";
import { addDays } from "date-fns";
import {
  BillingInvoiceBase,
  BillingInvoiceCreate,
  BillingInvoiceResponse,
} from "@/modules/payment/services/billing-invoice.validators";
import { getNameCountry } from "@/shared/utils/location";
import { sendInvoiceEmail } from "@/modules/payment/services/payment-mail.service";
import { InvoicePDFProps } from "@/modules/payment/templates/pdfs/InvoicePDF";
import { SentooService } from "@/infrastructure/sentoo/sentoo.service";
import { ActivationInvoiceInput } from "@/modules/payment/services/invoice.type";
import { ParameterService } from "@/modules/settings/services/parameter/parameter.service";

export class BillingInvoiceService {
  static async generateInvoiceNumber(): Promise<string> {
    const lastInvoice = await prisma.billingInvoice.findFirst({
      orderBy: { created_at: "desc" },
      select: { invoice_number: true },
    });

    let nextNumber = 1;
    if (lastInvoice?.invoice_number) {
      const numeric = parseInt(lastInvoice.invoice_number.replace(/\D/g, ""), 10);
      if (!isNaN(numeric)) nextNumber = numeric + 1;
    }

    return nextNumber.toString().padStart(3, "0");
  }

  static async createCollectionInvoice(params: ActivationInvoiceInput) {
    const tenant = await prisma.tenant.findUnique({ where: { id: params.tenant_id } });
    if (!tenant) throw new Error("Geen contact-e-mailadres gevonden voor deze organisatie");

    const issue_date = new Date();
    const due_date = addDays(issue_date, 7);
    const activationFee = params.fee_amount;
    const invoice_number = await this.generateInvoiceNumber();

    const invoice = await prisma.billingInvoice.create({
      data: {
        tenant_id: params.tenant_id,
        invoice_number,
        amount: activationFee,
        currency: "USD",
        issue_date,
        due_date,
        description: "Factuur voor activering van CFSB-systeemaccount",
        status: "unpaid",
        payment_id: "",
      },
    });

    const totalWithTax = activationFee + params.abb_amount;

    await prisma.billingInvoiceDetail.create({
      data: {
        billing_invoice_id: invoice.id,
        item_description: "Digitale dossierkosten",
        item_quantity: 1,
        item_unit_price: params.digital_file_costs,
        item_total_price: params.digital_file_costs,
        item_tax_rate: 0,
        item_tax_amount: 0,
        item_total_with_tax: params.digital_file_costs,
      },
    });

    await prisma.billingInvoiceDetail.create({
      data: {
        billing_invoice_id: invoice.id,
        item_description: "Servicekosten",
        item_quantity: 1,
        item_unit_price: activationFee,
        item_total_price: activationFee,
        item_tax_rate: 0.06,
        item_tax_amount: params.abb_amount,
        item_total_with_tax: totalWithTax,
      },
    });

    const res = await SentooService.createTransaction({
      amount: totalWithTax,
      description: `Factura ${invoice_number} - Activation fee`,
      reference: invoice.id,
    });

    if (!res.success) throw new Error("Er is een fout opgetreden bij het aanmaken van de betaling in Sentoo");

    if (tenant.contact_email) {
      await sendInvoiceEmail(tenant.contact_email, invoice.id, false);
    }

    return invoice;
  }

  static async getDataInvoicePDF(id: string): Promise<InvoicePDFProps> {
    const invoice = await prisma.billingInvoice.findUnique({
      where: { id },
      include: { tenant: true, details: true },
    });

    if (!invoice) throw new Error("Factuur niet gevonden");

    const parameter = await ParameterService.getParameter();
    if (!parameter) throw new Error("Parameter niet gevonden");

    const island = getNameCountry(invoice.tenant.country_code);

    return {
      logoUrl: process.env.NEXT_PUBLIC_LOGO_URL || "",
      invoice_number: invoice.invoice_number,
      issue_date: invoice.issue_date.toISOString().split("T")[0],
      customer_name: invoice.tenant.name,
      customer_address: invoice.tenant.address || "N/A",
      customer_island: island || "N/A",
      bank_name: parameter.bank_name || "MCB",
      bank_account: parameter.bank_account || "418.825.10",
      details: invoice.details.map((detail: any) => ({
        item_description: detail.item_description,
        item_quantity: detail.item_quantity,
        item_unit_price: Number(detail.item_unit_price.toFixed(2)),
        item_tax_rate: Number(detail.item_tax_rate.toFixed(2)),
        item_subtotal: Number(detail.item_total_with_tax.toFixed(2)),
      })),
      total: Number(
        invoice.details
          .reduce((acc: any, detail: any) => acc + detail.item_total_with_tax, 0)
          .toFixed(2),
      ),
    };
  }

  static async getAll(): Promise<BillingInvoiceResponse[]> {
    const invoices = await prisma.billingInvoice.findMany({ include: { details: true } });
    return invoices.map(this.mapInvoiceResponse);
  }

  // La factura GOP no tiene FK directa a debtClaimId (el modelo Payment es
  // compartido por suscripciones/contratos/etc. y no queremos ampliarlo para
  // esto); generateGopFeeInvoice codifica el debtClaimId en el
  // reference_number del Payment (`gop_${debtClaimId}_...`), así que ese es
  // el único rastro disponible para escopear facturas GOP por expediente.
  static async getForDebtClaimIds(debtClaimIds: string[]): Promise<BillingInvoiceResponse[]> {
    if (debtClaimIds.length === 0) return [];

    const invoices = await prisma.billingInvoice.findMany({
      where: {
        OR: debtClaimIds.map((debtClaimId) => ({
          payment: { reference_number: { startsWith: `gop_${debtClaimId}_` } },
        })),
      },
      include: { details: true },
    });

    return invoices.map(this.mapInvoiceResponse);
  }

  private static mapInvoiceResponse(invoice: any): BillingInvoiceResponse {
    return {
      tenant_id: invoice.tenant_id,
      id: invoice.id,
      invoice_number: invoice.invoice_number,
      amount: invoice.amount,
      currency: invoice.currency,
      issue_date: invoice.issue_date,
      status: invoice.status as "unpaid" | "paid" | "overdue",
      due_date: invoice.due_date,
      created_at: invoice.created_at,
      updated_at: invoice.updated_at,
      description: invoice.description,
      invoice_details: invoice.details.map((detail: any) => ({
        id: detail.id,
        invoice_id: detail.billing_invoice_id ?? invoice.id,
        item_description: detail.item_description,
        item_quantity: detail.item_quantity,
        item_unit_price: detail.item_unit_price,
        item_total_price: detail.item_total_price,
        item_tax_rate: detail.item_tax_rate,
        item_tax_amount: detail.item_tax_amount,
        item_total_with_tax: detail.item_total_with_tax,
        created_at: detail.created_at,
        updated_at: detail.updated_at,
      })),
    };
  }

  static async getById(id: string): Promise<BillingInvoiceBase | null> {
    const invoice = await prisma.billingInvoice.findUnique({
      where: { id },
      include: { tenant: true },
    });

    if (!invoice) return null;

    return { ...invoice, status: invoice.status as "unpaid" | "paid" | "overdue" };
  }

  // `payment_id` es obligatorio en el modelo (relación 1:1 con Payment) y
  // debe apuntar a un Payment real creado previamente (ver PaymentService.create,
  // que primero abre el "payment intent" contra Sentoo). Sin esto, el insert
  // viola la foreign key de forma silenciosa-hasta-que-truena en producción.
  static async create(
    invoice: BillingInvoiceCreate,
    tenant_id: string,
    payment_id?: string,
  ): Promise<BillingInvoiceBase> {
    if (!payment_id) {
      throw new Error(
        "BillingInvoiceService.create requiere un payment_id válido. Crea el Payment primero (PaymentService.create) y pasa su id aquí.",
      );
    }

    const newInvoice = await prisma.billingInvoice.create({
      data: {
        invoice_number: invoice.invoice_number,
        issue_date: invoice.issue_date,
        due_date: invoice.due_date,
        description: invoice.description,
        status: invoice.status,
        tenant_id,
        currency: "USD",
        amount: invoice.amount ?? 0,
        payment_id,
      },
    });

    await prisma.billingInvoiceDetail.createMany({
      data: (invoice.invoice_details ?? []).map((detail: any) => ({
        item_description: detail.item_description,
        item_quantity: detail.item_quantity,
        item_unit_price: detail.item_unit_price,
        item_total_price: detail.item_total_price,
        item_tax_rate: detail.item_tax_rate,
        item_tax_amount: detail.item_tax_amount,
        item_total_with_tax: detail.item_total_with_tax,
        billing_invoice_id: newInvoice.id,
      })),
    });

    return { ...newInvoice, status: newInvoice.status as "unpaid" | "paid" | "overdue" };
  }

  static async update(id: string, invoice: Partial<BillingInvoiceCreate>): Promise<boolean> {
    const updated = await prisma.billingInvoice.update({
      where: { id },
      data: {
        invoice_number: invoice.invoice_number,
        issue_date: invoice.issue_date,
        due_date: invoice.due_date,
        description: invoice.description,
        status: invoice.status,
      },
    });

    await prisma.billingInvoiceDetail.deleteMany({ where: { billing_invoice_id: id } });

    await prisma.billingInvoiceDetail.createMany({
      data: (invoice.invoice_details ?? []).map((detail: any) => ({
        item_description: detail.item_description,
        item_quantity: detail.item_quantity,
        item_unit_price: detail.item_unit_price,
        item_total_price: detail.item_total_price,
        item_tax_rate: detail.item_tax_rate,
        item_tax_amount: detail.item_tax_amount,
        item_total_with_tax: detail.item_total_with_tax,
        invoiceId: updated.id,
      })),
    });

    return !!updated;
  }

  static async delete(id: string): Promise<boolean> {
    const deleted = await prisma.billingInvoice.delete({ where: { id } });
    return !!deleted;
  }

  static async getNextInvoiceNumber(tenant_id: string): Promise<string> {
    const parameter = await ParameterService.getParameter();
    if (!parameter) throw new Error("Parameter niet gevonden");

    const lastInvoice = await prisma.billingInvoice.findFirst({
      where: { tenant_id },
      orderBy: { created_at: "desc" },
    });

    let nextNumber = parameter.invoice_sequence || 1;
    if (lastInvoice?.invoice_number) {
      const match = lastInvoice.invoice_number.match(/(\d+)$/);
      if (match) nextNumber = parseInt(match[1], 10) + 1;
    }

    return `${parameter.invoice_prefix || ""}${String(nextNumber).padStart(parameter.invoice_number_length || 5, "0")}`;
  }
}
