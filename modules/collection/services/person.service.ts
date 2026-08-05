import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { IdentificationType as IdentificationTypeEnum } from "@/shared/constants/identification-type";
import { PersonInput } from "@/modules/collection/services/person.validators";

type PersonClient = Pick<typeof prisma, "person">;
type PrismaOrTx = typeof prisma | Prisma.TransactionClient;

export const PersonType = ["INDIVIDUAL", "COMPANY"] as const;
export const IdentificationType = [
  "KVK",
  "CEDULA",
  "PASSPORT",
  "RIJBEWIJS",
] as const;

// CFSBP = persona física (individual), CFSB = empresa participante. Nunca
// cambiar a "CFSB-P-..." — nomenclatura acordada explícitamente con CFSB.
const IDENTITY_PREFIX_BY_PERSON_TYPE: Record<string, string> = {
  INDIVIDUAL: "CFSBP",
  COMPANY: "CFSB",
};

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

  // Isla/jurisdicción por defecto cuando el llamador no tiene una explícita
  // (p.ej. un tenant sin jurisdictionId asignado todavía, en transición).
  // Data-driven: la "primera activa por orden de rollout", nunca un nombre
  // de isla hardcodeado (punto 13 del análisis CFSB — Bonaire es la
  // primera activa hoy porque así está cargado en Jurisdiction, no porque
  // el código lo asuma).
  static async resolveDefaultJurisdictionId(): Promise<string> {
    const fallback = await prisma.jurisdiction.findFirst({
      where: { isActive: true },
      orderBy: { rolloutOrder: "asc" },
    });
    if (!fallback) throw new Error("Geen actieve jurisdictie geconfigureerd.");
    return fallback.id;
  }

  // Formato acordado con CFSB — NUNCA cambiar el separador:
  //   CFSBP-<ISLAND>-000001  (person_type INDIVIDUAL — persona física)
  //   CFSB-<ISLAND>-000001   (person_type COMPANY — empresa participante)
  // <ISLAND> viene de Jurisdiction.numberingPrefix (dato), nunca de un
  // literal en el código. Es un número permanente: una vez asignado no se
  // regenera (ver ensurePersonalNumber). El secuencial es seguro contra
  // duplicados: usa una fila dedicada por (prefix, jurisdictionId) en
  // PersonIdentitySequence, bloqueada con SELECT ... FOR UPDATE dentro de
  // una transacción — dos altas concurrentes nunca leen el mismo valor
  // "actual", a diferencia del patrón anterior (findFirst + parseInt) que
  // sí podía colisionar.
  static async generatePersonalNumber(
    personType: string,
    jurisdictionId: string,
    client: PrismaOrTx = prisma,
  ): Promise<string> {
    const prefix = IDENTITY_PREFIX_BY_PERSON_TYPE[personType] ?? "CFSB";

    const jurisdiction = await prisma.jurisdiction.findUnique({ where: { id: jurisdictionId } });
    if (!jurisdiction) throw new Error("Jurisdictie niet gevonden.");
    const islandCode = jurisdiction.numberingPrefix;

    // Alta de la fila del contador FUERA de la transacción de bloqueo, en su
    // propia sentencia auto-confirmada: si el INSERT IGNORE (que también
    // toma un lock) y el SELECT ... FOR UPDATE compitieran dentro de la
    // misma transacción bajo alta concurrencia, InnoDB puede reportar un
    // deadlock (código 1213) entre transacciones concurrentes — verificado
    // con una prueba de 10 llamadas simultáneas antes de este ajuste.
    // Separarlos reduce la sección crítica del lock a 2 sentencias sobre
    // una fila que ya existe.
    await prisma.$executeRaw`
      INSERT IGNORE INTO person_identity_sequence (id, prefix, jurisdictionId, lastValue, updatedAt)
      VALUES (${crypto.randomUUID()}, ${prefix}, ${jurisdictionId}, 0, NOW())
    `;

    const runLocked = async (tx: Prisma.TransactionClient): Promise<number> => {
      const rows = await tx.$queryRaw<{ lastValue: number }[]>`
        SELECT lastValue FROM person_identity_sequence
        WHERE prefix = ${prefix} AND jurisdictionId = ${jurisdictionId}
        FOR UPDATE
      `;
      const next = (rows[0]?.lastValue ?? 0) + 1;

      await tx.$executeRaw`
        UPDATE person_identity_sequence SET lastValue = ${next}, updatedAt = NOW()
        WHERE prefix = ${prefix} AND jurisdictionId = ${jurisdictionId}
      `;

      return next;
    };

    // Si ya estamos dentro de una transacción (p.ej. DebtorService.findOrCreate
    // pasa su `tx`), el FOR UPDATE bloquea dentro de esa misma transacción.
    // Si no, abrimos una propia — un FOR UPDATE fuera de una transacción no
    // retiene el bloqueo el tiempo suficiente para proteger nada.
    const isTopLevelClient = typeof (client as typeof prisma).$transaction === "function";

    // InnoDB puede seguir reportando un deadlock ocasional bajo alta
    // concurrencia incluso con la sección crítica reducida (es el
    // comportamiento esperado y documentado de SELECT ... FOR UPDATE); la
    // respuesta correcta es reintentar la transacción, no fallar.
    const MAX_ATTEMPTS = 5;
    let lastError: unknown;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const next = isTopLevelClient
          ? await (client as typeof prisma).$transaction((tx) => runLocked(tx))
          : await runLocked(client as Prisma.TransactionClient);

        return `${prefix}-${islandCode}-${String(next).padStart(6, "0")}`;
      } catch (error) {
        lastError = error;
        const isDeadlock =
          error instanceof Prisma.PrismaClientKnownRequestError &&
          (error.meta as { code?: string } | undefined)?.code === "1213";
        if (!isDeadlock || attempt === MAX_ATTEMPTS) throw error;
        await new Promise((resolve) => setTimeout(resolve, 25 * attempt));
      }
    }
    throw lastError;
  }

  static async ensurePersonalNumber(
    personId: string,
    countryCode: string | null | undefined,
  ): Promise<string> {
    const person = await prisma.person.findUnique({ where: { id: personId } });
    if (!person) throw new Error("Person not found");
    if (person.personal_number) return person.personal_number;

    const jurisdictionId = person.jurisdictionId ?? (await this.resolveDefaultJurisdictionId());
    const personal_number = await this.generatePersonalNumber(person.person_type, jurisdictionId);

    await prisma.person.update({
      where: { id: personId },
      data: {
        personal_number,
        jurisdictionId,
        country_code: person.country_code ?? countryCode,
      },
    });

    return personal_number;
  }
}
