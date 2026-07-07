import { prisma } from "@/lib/prisma";
import { IdentificationType as IdentificationTypeEnum } from "@/shared/constants/identification-type";
import { PersonInput } from "@/modules/collection/services/person.validators";

export const PersonType = ["INDIVIDUAL", "COMPANY"] as const;
export const IdentificationType = [
  "KVK",
  "CEDULA",
  "PASSPORT",
  "RIJBEWIJS",
] as const;

export class PersonService {
  static async getById(id: string) {
    return prisma.person.findFirst({ where: { id } });
  }

  static async getByIdentification(identification: string) {
    return prisma.person.findFirst({ where: { identification } });
  }

  static async getAll(): Promise<PersonInput[]> {
    const persons = await prisma.person.findMany();
    return persons.map((person) => ({
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
    })) as PersonInput[];
  }

  static async getByIdentificationTypeAndValue(
    identificationType: IdentificationTypeEnum,
    identification: string,
  ) {
    return prisma.person.findFirst({
      where: { identification_type: identificationType, identification },
    });
  }
}
