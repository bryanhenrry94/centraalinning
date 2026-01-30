"use server";
import prisma from "@/lib/prisma";
import { InterestType } from "@/lib/validations/interest-type";

export async function getAllInterestTypes(): Promise<{
  interestTypes: InterestType[];
}> {
  const data = await prisma.interestType.findMany({
    include: {
      details: true,
    },
  });

  return { interestTypes: data as InterestType[] };
}

export async function getInterestTypeById(
  id: string
): Promise<InterestType | null> {
  const data = await prisma.interestType.findUnique({
    where: { id },
    include: { details: true },
  });

  return data as InterestType | null;
}

// Create
export async function createInterestType(data: any) {
  return await prisma.interestType.create({ data });
}

// Update
export async function updateInterestType(id: string, data: any) {
  return await prisma.interestType.update({
    where: { id },
    data,
  });
}

// Delete
export async function deleteInterestType(id: string) {
  return await prisma.interestType.delete({ where: { id } });
}
