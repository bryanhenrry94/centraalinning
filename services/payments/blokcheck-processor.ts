import { prisma } from "@/lib/prisma";
import { Payment } from "@prisma/client";

export const processBlokCheckPayment = async (payment: Payment) => {
  console.log("Processing blok check payment:", payment.id);

  const blokCheck = await prisma.blokCheckRequest.findFirst({
    where: {
      payment_id: payment.id,
    },
  });

  if (!blokCheck) {
    console.warn(`No blok check request found for payment ${payment.id}`);

    return;
  }

  // Evita reprocesar solicitudes ya pagadas
  if (blokCheck.payment_status === "paid") {
    console.log(`Blok check ${blokCheck.id} already processed`);

    return;
  }

  const person = await prisma.person.findUnique({
    where: {
      identification: blokCheck.document_number,
    },
    select: {
      has_blockade: true,
    },
  });

  await prisma.blokCheckRequest.update({
    where: {
      id: blokCheck.id,
    },
    data: {
      payment_status: "paid",
      has_blockade: person?.has_blockade ?? false,
    },
  });

  console.log(`✅ Blok check ${blokCheck.id} processed`);
};
