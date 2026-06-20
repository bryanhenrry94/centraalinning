"use server";
import { IdentificationType } from "@/constants/identification-type";
import { prisma } from "@/lib/prisma";
import {
  BlokCheckRequest,
  BlokCheckRequestCreate,
  BlokCheckRequestResponse,
} from "@/lib/validations/blok-check-request";
import { PaymentCreate } from "@/lib/validations/payment";
import { Prisma } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

export const createBlokCheckRequest = async (
  tenantId: string,
  data: BlokCheckRequestCreate,
) => {
  const person = await prisma.person.findFirst({
    where: {
      // identification_type: data.document_type as IdentificationType,
      identification: data.document_number,
    },
  });

  const personId = person ? person.id : null;

  const request = await prisma.blokCheckRequest.create({
    data: {
      tenant_id: tenantId,
      document_type: data.document_type as IdentificationType,
      document_number: data.document_number,
      amount: data.amount,
      person_id: personId,
    },
  });
  return request;
};

export const createPaymentForBlokCheckRequest = async (
  tenant_id: string,
  payload: PaymentCreate,
) => {
  const payment = await prisma.payment.create({
    data: {
      tenant_id: tenant_id,
      debt_id: payload.debt_id,
      method: payload.method || "TRANSFER",
      provider: payload.provider || "sentoo",
      provider_ref: payload.provider_ref || "",
      total_amount: new Prisma.Decimal(payload.total_amount),
      status: (payload.status as any) || "pending",
      provider_payload: payload.provider_payload || "",
      paid_at: null,
    },
  });

  return payment;
};

export const getBlokCheckRequest = async (
  id: string,
): Promise<BlokCheckRequest | null> => {
  const request = await prisma.blokCheckRequest.findUnique({
    where: { id },
  });

  return request
    ? {
        ...request,
        amount: request.amount.toNumber(),
        document_type: request.document_type.toString(),
        payment_status: request.payment_status.toString(),
        person_id: request.person_id ?? undefined,
        payment_id: request.payment_id ?? undefined,
        has_blockade: request.has_blockade ?? undefined,
        block_reason: request.block_reason ?? undefined,
        checked_at: request.checked_at ?? undefined,
      }
    : null;
};

export const updateBlokCheckRequest = async (
  id: string,
  data: Partial<BlokCheckRequest>,
) => {
  const updatedRequest = await prisma.blokCheckRequest.update({
    where: { id },
    data: {
      document_type: data.document_type as IdentificationType,
      document_number: data.document_number,
      amount: data.amount ? new Decimal(data.amount) : undefined,
      payment_status: data.payment_status
        ? (data.payment_status as any)
        : undefined,
      person_id: data.person_id,
      payment_id: data.payment_id,
      has_blockade: data.has_blockade,
      block_reason: data.block_reason,
      checked_at: data.checked_at,
    },
  });
  return updatedRequest;
};

export const deleteBlokCheckRequest = async (id: string) => {
  await prisma.blokCheckRequest.delete({
    where: { id },
  });
};

export const listBlokCheckRequests = async (
  tenantId: string,
): Promise<BlokCheckRequestResponse[]> => {
  const requests = await prisma.blokCheckRequest.findMany({
    where: { tenant_id: tenantId },
    include: {
      person: true,
    },
    orderBy: { created_at: "desc" },
    take: 1,
  });

  return requests.map((request) => ({
    ...request,

    amount: request.amount.toNumber(),

    document_type: request.document_type,
    payment_status: request.payment_status,

    person_id: request.person_id,

    payment_id: request.payment_id ?? undefined,

    has_blockade: request.has_blockade ?? undefined,
    block_reason: request.block_reason ?? undefined,
    checked_at: request.checked_at ?? undefined,

    identification_type: request.document_type as IdentificationType,

    fullname: request.person
      ? `${request.person.first_name} ${request.person.last_name}`
      : undefined,
  }));
};

export const existBlokCheckRequestForDocument = async (
  documentNumber: string,
): Promise<boolean> => {
  const count = await prisma.person.count({
    where: {
      identification: documentNumber,
    },
  });

  return count > 0;
};
