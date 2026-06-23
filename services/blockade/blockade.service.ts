import { prisma } from "@/lib/prisma";
import { CreateBlockadeInput } from "./blockade.validators";
import { Prisma } from "@prisma/client";

export class BlockadeService {
  static createBlockade = async (
    input: CreateBlockadeInput,
    tenantId: string,
  ) => {
    const blockade = await prisma.blockade.create({
      data: {
        tenantId: tenantId,
        debtorId: input.debtorId,
        amount: input.amount,
        reason: input.reason,
        status: "ACTIVE",
      },
    });

    return blockade;
  };

  static list = async (tenantId: string, search: string, page: string) => {
    const whereClause: Prisma.BlockadeWhereInput = {
      tenantId: tenantId,
    };

    if (search) {
      whereClause.OR = [
        {
          debtor: {
            person: {
              first_name: { contains: search },
            },
          },
        },
        {
          debtor: {
            person: {
              last_name: { contains: search },
            },
          },
        },
      ];
    }

    const pageNumber = parseInt(page, 10) || 1;
    const pageSize = 10;
    const skip = (pageNumber - 1) * pageSize;

    return await prisma.blockade.findMany({
      where: whereClause,
      skip,
      take: pageSize,
      include: {
        debtor: {
          include: {
            person: true,
          },
        },
        documents: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  };

  static getById = async (id: string) => {
    console.log("Fetching blockade with ID:", id);
    return await prisma.blockade.findUnique({
      where: { id },
      include: {
        debtor: {
          include: {
            person: true,
          },
        },
        documents: true,
      },
    });
  };
}
