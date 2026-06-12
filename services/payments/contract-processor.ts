import { prisma } from "@/lib/prisma";
import { Payment } from "@prisma/client";
import { InvoiceService } from "../invoices/invoice-service";
import { sendActivateContractMail, sendInvoiceEmail } from "@/actions/email";

export const processContractPayment = async (payment: Payment) => {
  console.log("Processing contract payment:", payment.id);

  if (!payment.contract_id) {
    console.warn(`Payment ${payment.id} has no contract_id associated`);

    return;
  }

  const contract = await prisma.contract.findUnique({
    where: {
      id: payment.contract_id!,
    },
  });

  if (!contract) {
    throw new Error(`Contract ${payment.contract_id} not found`);
  }

  // Evita reprocesar contratos ya activados
  if (contract.status === "REGISTERED") {
    console.log(`Contract ${contract.id} already registered`);

    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.contract.update({
      where: {
        id: contract.id,
      },
      data: {
        status: "REGISTERED",
        updated_at: new Date(),
      },
    });

    console.log(`✅ Contract ${contract.reference_number} activated`);
  });

  // TODO:
  // 1. Generar factura
  const invoiceData = await InvoiceService.generateInvoiceData(payment.id);
  // 2. Crear registro Invoice
  const invoice = await InvoiceService.createInvoice(invoiceData);
  // 3. Enviar email con factura
  const parties = await prisma.contractParty.findMany({
    where: {
      contract_id: contract.id,
    },
  });

  // 4. Notificar al cliente que el contrato ha sido activado
  for (const party of parties) {
    if (party.role === "PARTY_A") {
      // enviar factura al cliente (PARTY_A)
      await sendInvoiceEmail(party.email, invoice.id, true);
    }

    // enviar notificación de activación al cliente (PARTY_A)
    await sendActivateContractMail(
      party.email,
      party.fullname,
      contract.reference_number,
    );
  }
};
