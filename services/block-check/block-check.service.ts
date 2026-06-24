import { prisma } from "@/lib/prisma";
import { BlokCheckResponse } from "./block-check.types";
import { Prisma } from "@prisma/client";

export class BlockCheckService {
  static existsBlockCheck = async (
    search: string,
  ): Promise<{ success: boolean; data?: BlokCheckResponse }> => {
    const where: Prisma.PersonWhereInput = {
      identification: search.trim(),
    };

    const person = await prisma.person.findFirst({
      where,
    });

    if (!person) {
      return {
        success: false,
      };
    }

    return {
      success: true,
      data: {
        identification_type: person.identification_type,
        document_number: person.identification,
        person_id: person.id,
        fullname: `${person.first_name} ${person.last_name}`.trim(),
        has_blockade: person.has_blockade,
      },
    };
  };
}
