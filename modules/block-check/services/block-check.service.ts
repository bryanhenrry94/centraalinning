import { prisma } from "@/lib/prisma";
import { BlokCheckResponse } from "./block-check.types";
import { Person, Prisma } from "@prisma/client";

const MULTIPLE_PERSONS_FOUND_ERROR =
  "Meerdere personen gevonden met deze naam. Gebruik het identificatienummer of CFSB-nummer om te verfijnen.";

export class BlockCheckService {
  private static buildFullName(
    person: Pick<Person, "first_name" | "middle_name" | "last_name">,
  ): string {
    return [person.first_name, person.middle_name, person.last_name]
      .filter(Boolean)
      .join(" ");
  }

  // Zoeken op naam (voornaam/middelnaam/achternaam) naast identificatienummer
  // en CFSB-nummer — vereiste sponsor 2026-09-02/03. De term wordt in
  // woorden gesplitst zodat "Joselyn Andrade" matcht ongeacht de volgorde
  // van de namen; is de match niet eenduidig (meerdere personen), dan wordt
  // dat expliciet gemeld in plaats van willekeurig de eerste te kiezen.
  private static async findPersonByName(
    term: string,
  ): Promise<{ person: Person | null; ambiguous: boolean }> {
    const tokens = term.split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return { person: null, ambiguous: false };

    const candidates = await prisma.person.findMany({
      where: {
        person_type: "INDIVIDUAL",
        OR: tokens.flatMap((token) => [
          { first_name: { contains: token } },
          { middle_name: { contains: token } },
          { last_name: { contains: token } },
        ]),
      },
    });

    const normalizedTokens = tokens.map((token) => token.toLowerCase());
    const matches = candidates.filter((candidate) => {
      const fullName = this.buildFullName(candidate).toLowerCase();
      return normalizedTokens.every((token) => fullName.includes(token));
    });

    if (matches.length === 0) return { person: null, ambiguous: false };
    if (matches.length > 1) return { person: null, ambiguous: true };
    return { person: matches[0], ambiguous: false };
  }

  static existsBlockCheck = async (
    search: string,
    context: {
      tenantId: string;
      userId?: string;
      price: number;
    },
  ): Promise<{ success: boolean; data?: BlokCheckResponse; error?: string }> => {
    const term = search.trim();

    const where: Prisma.PersonWhereInput = {
      OR: [{ identification: term }, { personal_number: term }],
    };

    let person = await prisma.person.findFirst({ where });

    if (!person) {
      const { person: matchedPerson, ambiguous } =
        await this.findPersonByName(term);

      if (ambiguous) {
        return { success: false, error: MULTIPLE_PERSONS_FOUND_ERROR };
      }

      person = matchedPerson;
    }

    if (!person) {
      return { success: false };
    }

    // Check for an active blockade across ALL tenants via the Debtor relation.
    // releasedAt === null means the blockade is still active.
    // A blockade registered by any tenant makes the person blocked globally.
    const activeBlockade = await prisma.blockade.findFirst({
      where: {
        debtor: { person_id: person.id },
        releasedAt: null,
      },
    });

    const has_blockade = !!activeBlockade;

    // Debtor record within the querying tenant (for audit purposes only)
    const debtor = await prisma.debtor.findFirst({
      where: { person_id: person.id, tenant_id: context.tenantId },
    });

    const blockCheck = await prisma.blockCheck.create({
      data: {
        tenantId: context.tenantId,
        personId: person.id,
        debtorId: debtor?.id ?? null,
        blockadeFound: has_blockade,
        price: new Prisma.Decimal(context.price),
        checkedById: context.userId,
      },
    });

    return {
      success: true,
      data: {
        identification_type: person.identification_type,
        document_number: person.identification,
        person_id: person.id,
        fullname:
          (this.buildFullName(person) || person.business_name) ?? undefined,
        has_blockade,
        reference: blockCheck.id,
        checked_at: blockCheck.checkedAt,
      },
    };
  };
}
