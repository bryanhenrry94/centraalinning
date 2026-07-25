import { prisma } from "@/lib/prisma";
import { IdentificationType as IdentificationTypeEnum } from "@/shared/constants/identification-type";
import { PersonInput } from "@/modules/collection/services/person.validators";

type PersonClient = Pick<typeof prisma, "person">;

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

  // Formato: CFSB-P-<COUNTRY_CODE>-###### (secuencial por país, 6 dígitos).
  // `client` puede ser el cliente global de Prisma o una transacción activa.
  static async generatePersonalNumber(
    countryCode: string | null | undefined,
    client: PersonClient = prisma,
  ): Promise<string> {
    const prefix = `CFSB-P-${countryCode || "XX"}-`;

    const last = await client.person.findFirst({
      where: { personal_number: { startsWith: prefix } },
      orderBy: { personal_number: "desc" },
      select: { personal_number: true },
    });

    const lastSeq = last?.personal_number
      ? parseInt(last.personal_number.slice(prefix.length), 10)
      : 0;

    const nextSeq = (Number.isNaN(lastSeq) ? 0 : lastSeq) + 1;

    return `${prefix}${String(nextSeq).padStart(6, "0")}`;
  }

  static async ensurePersonalNumber(
    personId: string,
    countryCode: string | null | undefined,
  ): Promise<string> {
    const person = await prisma.person.findUnique({ where: { id: personId } });
    if (!person) throw new Error("Person not found");
    if (person.personal_number) return person.personal_number;

    const personal_number = await this.generatePersonalNumber(
      person.country_code ?? countryCode,
    );

    await prisma.person.update({
      where: { id: personId },
      data: {
        personal_number,
        country_code: person.country_code ?? countryCode,
      },
    });

    return personal_number;
  }
}
