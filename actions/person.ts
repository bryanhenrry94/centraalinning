"use server";
import { prisma } from "@/lib/prisma";
import { PersonInput } from "@/lib/validations/person";

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

export const getAllPersons = async (): Promise<PersonInput[]> => {
  const persons = await prisma.person.findMany();

  const personFormatted: PersonInput[] = persons.map((person) => ({
    id: person.id,
    person_type: person.person_type,
    identification_type: person.identification_type,
    identification: person.identification,
    first_name: person.first_name,
    last_name: person.last_name,
    business_name: person.business_name,
    email: person.email,
    phone: person.phone,
    address: person.address,
    has_blockade: person.has_blockade,
  }));

  return personFormatted;
};
