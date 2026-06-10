import { getParameter } from "@/actions/parameter";
import { prisma } from "@/lib/prisma";
import { PaymentType } from "@prisma/client";

export interface InvoiceData {
  payment_id: string;
  invoice_number: string;
  issue_date: Date;
  due_date: Date;
  description: string;
  status: string;
  tenant_id: string;
  currency: string;
  amount: number;
  details: {
    item_description: string;
    item_quantity: number;
    item_unit_price: number;
    item_total_price: number;
    item_tax_rate: number;
    item_tax_amount: number;
    item_total_with_tax: number;
  }[];
}

export class InvoiceService {
  static async generateInvoiceData(paymentId: string): Promise<InvoiceData> {
    const payment = await prisma.payment.findUnique({
      where: {
        id: paymentId,
      },
    });

    if (!payment) {
      throw new Error(`Payment ${paymentId} not found`);
    }

    const parameter = await getParameter();

    if (!parameter) {
      throw new Error("No se encontró la configuración del sistema");
    }

    const amount = Number(payment.total_amount);

    const taxRate = Number(parameter.abb_rate ?? 0.21);

    const subtotal = Number((amount / (1 + taxRate)).toFixed(2));

    const taxAmount = Number((amount - subtotal).toFixed(2));

    const invoiceNumber = await InvoiceService.generateInvoiceNumber();

    const description = InvoiceService.getDescriptionFromPaymentType(
      payment.payment_type,
    );

    return {
      payment_id: payment.id,

      invoice_number: invoiceNumber,

      issue_date: new Date(),

      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),

      description,

      status: "ISSUED",

      tenant_id: payment.tenant_id,

      currency: "USD",

      amount,

      details: [
        {
          item_description: description,

          item_quantity: 1,

          item_unit_price: subtotal,

          item_total_price: subtotal,

          item_tax_rate: taxRate,

          item_tax_amount: taxAmount,

          item_total_with_tax: amount,
        },
      ],
    };
  }

  static async createInvoice(invoiceData: InvoiceData) {
    const existingInvoice = await prisma.billingInvoice.findUnique({
      where: {
        payment_id: invoiceData.payment_id,
      },
      include: {
        details: true,
      },
    });

    if (existingInvoice) {
      return existingInvoice;
    }

    try {
      return await prisma.billingInvoice.create({
        data: {
          payment_id: invoiceData.payment_id,

          invoice_number: invoiceData.invoice_number,

          issue_date: invoiceData.issue_date,

          due_date: invoiceData.due_date,

          description: invoiceData.description,

          status: invoiceData.status,

          tenant_id: invoiceData.tenant_id,

          currency: invoiceData.currency,

          amount: invoiceData.amount,

          details: {
            create: invoiceData.details,
          },
        },
        include: {
          details: true,
        },
      });
    } catch (error: any) {
      if (error.code === "P2002") {
        const existing = await prisma.billingInvoice.findUnique({
          where: {
            payment_id: invoiceData.payment_id,
          },
          include: {
            details: true,
          },
        });

        if (existing) {
          return existing;
        }
      }

      throw error;
    }
  }

  static async generateInvoice(paymentId: string) {
    const payment = await prisma.payment.findUnique({
      where: {
        id: paymentId,
      },
    });

    if (!payment) {
      throw new Error(`Payment ${paymentId} not found`);
    }

    /**
     * Si ya existe una factura para este pago, devolverla.
     */
    const existingInvoice = await prisma.billingInvoice.findUnique({
      where: {
        payment_id: payment.id,
      },
      include: {
        details: true,
      },
    });

    if (existingInvoice) {
      return existingInvoice;
    }

    const parameter = await getParameter();

    if (!parameter) {
      throw new Error("No se encontró la configuración del sistema");
    }

    const amount = Number(payment.total_amount);

    /**
     * IVA configurable
     */
    const taxRate = Number(parameter.abb_rate ?? 0.21);

    const subtotal = Number((amount / (1 + taxRate)).toFixed(2));

    const taxAmount = Number((amount - subtotal).toFixed(2));

    const invoiceNumber = await InvoiceService.generateInvoiceNumber();

    const description = InvoiceService.getDescriptionFromPaymentType(
      payment.payment_type,
    );

    try {
      const invoice = await prisma.billingInvoice.create({
        data: {
          payment_id: payment.id,

          invoice_number: invoiceNumber,

          issue_date: new Date(),

          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),

          description,

          status: "ISSUED",

          tenant_id: payment.tenant_id,

          currency: "EUR",

          amount,

          details: {
            create: [
              {
                item_description: description,
                item_quantity: 1,

                item_unit_price: subtotal,

                item_total_price: subtotal,

                item_tax_rate: taxRate,

                item_tax_amount: taxAmount,

                item_total_with_tax: amount,
              },
            ],
          },
        },
        include: {
          details: true,
        },
      });

      console.log(
        `✅ Invoice ${invoice.invoice_number} generated for payment ${payment.id}`,
      );

      return invoice;
    } catch (error: any) {
      /**
       * Si dos procesos intentan crear la misma factura
       * al mismo tiempo, recuperamos la existente.
       */
      if (error.code === "P2002") {
        const existing = await prisma.billingInvoice.findUnique({
          where: {
            payment_id: payment.id,
          },
          include: {
            details: true,
          },
        });

        if (existing) {
          return existing;
        }
      }

      throw error;
    }
  }

  static getDescriptionFromPaymentType(paymentType: PaymentType): string {
    switch (paymentType) {
      case "SUBSCRIPTION":
        return "Subscription fee";

      case "CONTRACT_ACTIVATION":
        return "Contract activation fee";

      case "AGREEMENT_INSTALLMENT":
        return "Agreement installment";

      case "DEBT_PAYMENT":
        return "Debt payment";

      case "BLOK_CHECK":
        return "Blok check service";

      case "FINANCIAL_REPORT":
        return "Financial report service";

      default:
        return "Service payment";
    }
  }

  static async generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();

    const count = await prisma.billingInvoice.count({
      where: {
        issue_date: {
          gte: new Date(`${year}-01-01`),
          lt: new Date(`${year + 1}-01-01`),
        },
      },
    });

    const sequence = String(count + 1).padStart(6, "0");

    return `INV-${year}-${sequence}`;
  }
}
