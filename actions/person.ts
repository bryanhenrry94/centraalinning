"use server";
import { prisma } from "@/lib/prisma";

export const getPersonById = async (id: string) => {
  const person = await prisma.person.findFirst({
    where: {
      id,
    },
  });

  return person;
};

export const getPersonByIdentification = async (identification: string) => {
  const person = await prisma.person.findFirst({
    where: {
      identification,
    },
  });

  return person;
};
