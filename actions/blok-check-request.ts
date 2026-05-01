"use server";
import { prisma } from "@/lib/prisma";
import { BlokCheckRequestCreate } from "@/lib/validations/blok-check-request";

export const createBlokCheckRequest = async (
  tenantId: string,
  data: BlokCheckRequestCreate,
) => {
  const request = await prisma.blokCheckRequest.create({
    data: {
      tenant_id: tenantId,
      document_type: data.document_type as any,
      document_number: data.document_number,
      amount: data.amount,
    },
  });
  return request;
};

export const getBlokCheckRequest = async (id: string) => {
  const request = await prisma.blokCheckRequest.findUnique({
    where: { id },
  });
  return request;
};

export const deleteBlokCheckRequest = async (id: string) => {
  await prisma.blokCheckRequest.delete({
    where: { id },
  });
};

export const listBlokCheckRequests = async (tenantId: string) => {
  const requests = await prisma.blokCheckRequest.findMany({
    where: { tenant_id: tenantId },
    orderBy: { created_at: "desc" },
  });
  return requests;
};
