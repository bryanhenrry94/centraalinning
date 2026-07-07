import { prisma } from "@/lib/prisma";
import { PaymentType } from "@prisma/client";
import { ParameterService } from "@/modules/settings/services/parameter/parameter.service";
import { addDays } from "date-fns/addDays";
import { createSentooPayment } from "@/actions/sentoo.actions";
import { sendInvoiceEmail } from "@/actions/email";
import { PaymentCreate } from "@/lib/validations/payment";
import { ActivationInvoiceInput } from "./invoice.type";
import { PaymentService } from "@/modules/payment/services/payment.service";

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
  static generateInvoiceData = async (
    paymentId: string,
  ): Promise<InvoiceData> => {
    const payment = await prisma.payment.findUnique({
      where: {
        id: paymentId,
      },
    });

    if (!payment) {
      throw new Error(`Payment ${paymentId} not found`);
    }

    const parameter = await ParameterService.getParameter();

    if (!parameter) {
      throw new Error("No se encontró la configuración del sistema");
    }

    const amount = Number(payment.total_amount);

    const taxRatePercentage = Number(parameter.abb_rate ?? 0);

    const taxRate = taxRatePercentage / 100;

    const unitPrice = Number((amount / (1 + taxRate)).toFixed(2));

    const taxAmount = Number((amount - unitPrice).toFixed(2));

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

          item_unit_price: unitPrice,

          item_total_price: unitPrice,

          item_tax_rate: taxRatePercentage,

          item_tax_amount: taxAmount,

          item_total_with_tax: amount,
        },
      ],
    };
  };

  static createInvoice = async (invoiceData: InvoiceData) => {
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
  };

  static getDescriptionFromPaymentType(paymentType: PaymentType): string {
    switch (paymentType) {
      case "SUBSCRIPTION":
        return "Subscription fee";

      case "CONTRACT_ACTIVATION":
        return "Financiële afspraakregistratie";

      case "AGREEMENT_INSTALLMENT":
        return "Afbetalingsregeling";

      case "DEBT_PAYMENT":
        return "Schuldbetaling";

      case "BLOK_CHECK":
        return "Blok check service";

      case "FINANCIAL_REPORT":
        return "Financial report service";

      default:
        return "Service payment";
    }
  }

  static generateInvoiceNumber = async (): Promise<string> => {
    const year = new Date().getFullYear();

    const count = await prisma.billingInvoice.count({
      where: {
        issue_date: {
          gte: new Date(`${year}-01-01`),
          lt: new Date(`${year + 1}-01-01`),
        },
      },
    });

    const sequence = String(count + 1).padStart(3, "0");

    return `INV-${year}-${sequence}`;
  };

  static createActivationInvoice = async (params: ActivationInvoiceInput) => {
    const tenant = await prisma.tenant.findUnique({
      where: { id: params.tenant_id },
    });

    if (!tenant) {
      throw new Error("No contact email found for tenant");
    }

    // Definir valores base
    const issue_date = new Date();
    const due_date = addDays(issue_date, 7);

    // Obtener parámetro necesario
    const parameter = await ParameterService.getParameter();
    if (!parameter) {
      throw new Error("No se encontró el parámetro");
    }

    // Costo base de activación
    const activationFee = params.fee_amount;

    // Generar número de factura único
    const invoice_number = await InvoiceService.generateInvoiceNumber();

    // Crear factura principal
    const invoice = await prisma.billingInvoice.create({
      data: {
        tenant_id: params.tenant_id,
        invoice_number,
        amount: activationFee,
        currency: "USD",
        issue_date,
        due_date,
        description:
          "Factura por activación de cuenta del sistema Centraal Inning",
        status: "unpaid",
        payment_id: "",
      },
    });

    const totalWithTax = activationFee * (1 + parameter.abb_rate / 100);

    // Crear el detalle de factura
    await prisma.billingInvoiceDetail.create({
      data: {
        billing_invoice_id: invoice.id,
        item_description: "Registratiekosten",
        item_quantity: 1,
        item_unit_price: activationFee,
        item_total_price: activationFee,
        item_tax_rate: parameter.abb_rate / 100, // 6% ejemplo
        item_tax_amount: activationFee * (parameter.abb_rate / 100),
        item_total_with_tax: totalWithTax,
      },
    });

    // Crear el pago en Sentoo
    const res = await createSentooPayment({
      amount: totalWithTax, // YA en centavos
      description: `Factura ${invoice_number} - Registratiekosten`,
      reference: invoice.id,
    });

    if (!res.success) {
      throw new Error("Hubo un error al crear el pago en Sentoo");
    }

    console.log("payment created:", res.payment);

    // Crea el registro de pago en la base de datos
    const payment: PaymentCreate = {
      debtClaim_id: null, // No hay una deuda previa, este es un pago directo por activación
      method: "TRANSFER",
      total_amount: totalWithTax,
      paid_at: null,
      status: "pending",
      provider: "sentoo",
      provider_ref: res?.payment?.id,
      provider_payload: JSON.stringify(res.raw),
      reference_number: "",
      agreement_id: null,
      payment_type: "SUBSCRIPTION", // O el tipo que corresponda según tu lógica de negocio
    };

    const paymentRes = await PaymentService.registerPayment(tenant.id, payment);
    console.log("Payment registered in DB:", paymentRes);

    // Enviar correo con la factura al email de contacto del tenant
    if (tenant.contact_email) {
      await sendInvoiceEmail(
        tenant.contact_email,
        invoice.id,
        false, // isPaid
      );
    }

    return invoice;
  };
}
