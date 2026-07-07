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
    const where: Prisma.PersonWhereInput = {
      identification: search.trim(),
    };

    const person = await prisma.person.findFirst({ where });

    if (!person) {
      return { success: false };
    }

    // Look for the Debtor record linked to this Person within the current tenant
    const debtor = await prisma.debtor.findFirst({
      where: { person_id: person.id, tenant_id: context.tenantId },
    });

    await prisma.blockCheck.create({
      data: {
        tenantId: context.tenantId,
        personId: person.id,
        debtorId: debtor?.id ?? null,
        blockadeFound: person.has_blockade,
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
        has_blockade: person.has_blockade,
      },
    };
  };
}
