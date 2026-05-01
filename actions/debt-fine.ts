"use server";
import { prisma } from "@/lib/prisma";

type FineType = "MORA" | "PENALTY" | "INTEREST" | "JUDICIAL_FEE" | "OTHER";

export const applyFine = async (
  debt_id: string,
  amount: number,
  description: string,
  type: FineType
) => {
  const fine = await prisma.debtFine.create({
    data: {
      debt_id,
      amount,
      type,
      description,
      status: "ACTIVE",
      applied_at: new Date(),
    },
  });

  return fine;
};

export const getFinesForCollectionCase = async (debt_id: string) => {
  const fines = await prisma.debtFine.findMany({
    where: { debt_id },
    orderBy: { applied_at: "desc" },
  });

  return fines;
};

export const getCollectionCaseFineById = async (fine_id: string) => {
  const fine = await prisma.debtFine.findUnique({
    where: { id: fine_id },
  });

  return fine;
};
export const deleteCollectionCaseFine = async (fine_id: string) => {
  await prisma.debtFine.delete({
    where: { id: fine_id },
  });
};
export const countFinesForCollectionCase = async (debt_id: string) => {
  const count = await prisma.debtFine.count({
    where: { debt_id },
  });

  return count;
};
