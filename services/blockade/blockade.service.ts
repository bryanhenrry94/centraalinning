import { prisma } from "@/lib/prisma";
import { CreateBlockadeInput } from "./blockade.validators";
import { Prisma } from "@prisma/client";

export class BlockadeService {
  static createBlockade = async (
    input: CreateBlockadeInput,
    tenantId: string,
  ) => {
    const referenceNumber = await BlockadeService.generateReferenceNumber();

    const blockade = await prisma.blockade.create({
      data: {
        tenantId: tenantId,
        debtorId: input.debtorId,
        reason: input.reason,
      },
    });

    return blockade;
  };

  static list = async (
    tenantId: string,
    search: string,
    page: number,
    limit: number,
  ) => {
    const pageNumber = Number(page) || 1;
    const pageSize = Number(limit) || 10;

    const whereClause: Prisma.BlockadeWhereInput = {
      tenantId,
    };

    if (search?.trim()) {
      whereClause.OR = [
        {
          debtor: {
            person: {
              first_name: {
                contains: search,
              },
            },
          },
        },
        {
          debtor: {
            person: {
              last_name: {
                contains: search,
              },
            },
          },
        },
      ];
    }

    const totalBlockades = await prisma.blockade.count();

    console.log("Total blockades:", totalBlockades);
    console.log("Tenant:", tenantId);

    const tenantBlockades = await prisma.blockade.count({
      where: {
        tenantId,
      },
    });

    console.log("Tenant blockades:", tenantBlockades);

    const skip = (pageNumber - 1) * pageSize;

    console.log(
      "Fetching blockades with where clause:",
      whereClause,
      "skip:",
      skip,
      "take:",
      pageSize,
    );

    const [items, total] = await Promise.all([
      prisma.blockade.findMany({
        where: whereClause,
        skip,
        take: pageSize,
        include: {
          debtor: {
            include: {
              person: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      }),

      prisma.blockade.count({
        where: whereClause,
      }),
    ]);

    return {
      items,
      total,
      page: pageNumber,
      limit: pageSize,
    };
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

  static generateReferenceNumber = async () => {
    const year = new Date().getFullYear();

    const total = await prisma.blockade.count();

    return `BLK-${year}-${String(total + 1).padStart(3, "0")}`;
  };
}
