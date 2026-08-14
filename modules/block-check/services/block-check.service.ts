import { prisma } from "@/lib/prisma";
import { BlokCheckResponse } from "./block-check.types";
import { Prisma } from "@prisma/client";

export class BlockCheckService {
  static existsBlockCheck = async (
    search: string,
    context: {
      tenantId: string;
      userId?: string;
      price: number;
    },
  ): Promise<{ success: boolean; data?: BlokCheckResponse }> => {
    const term = search.trim();

    const where: Prisma.PersonWhereInput = {
      OR: [{ identification: term }, { personal_number: term }],
    };

    const person = await prisma.person.findFirst({ where });

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
          (`${person.first_name ?? ""} ${person.last_name ?? ""}`.trim() ||
            person.business_name) ?? undefined,
        has_blockade,
        reference: blockCheck.id,
        checked_at: blockCheck.checkedAt,
      },
    };
  };
}
