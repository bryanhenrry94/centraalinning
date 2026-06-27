import { prisma } from "@/lib/prisma";
import { TableSummaryResponse } from "./types";

export class ReportService {
  static getTableSummary = async (
    tenantId: string,
    limit: number = 5,
  ): Promise<TableSummaryResponse[]> => {
    const [contracts, collections, blockades] = await Promise.all([
      prisma.contract.findMany({
        where: {
          tenant_id: tenantId,
        },
        select: {
          id: true,
          contract_date: true,
          reference_number: true,
          amount: true,
          status: true,
          parties: {
            select: {
              fullname: true,
            },
          },
        },
      }),

      prisma.collectionCase.findMany({
        where: {
          tenant_id: tenantId,
        },
        select: {
          id: true,
          issue_date: true,
          reference_number: true,
          balance: true,
          status: true,
          debtor: {
            select: {
              person: {
                select: {
                  first_name: true,
                  last_name: true,
                },
              },
            },
          },
        },
      }),

      prisma.blockade.findMany({
        where: {
          tenantId,
        },
        select: {
          id: true,
          createdAt: true,
          reference_number: true,
          amount: true,
          status: true,
          debtor: {
            select: {
              person: {
                select: {
                  first_name: true,
                  last_name: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const contractRows: TableSummaryResponse[] = contracts.map((contract) => ({
      id: contract.id,
      source: "contract",
      date: contract.contract_date,
      reference_number: contract.reference_number,
      name: contract.parties.map((p) => p.fullname).join(" / "),
      amount: Number(contract.amount),
      status: contract.status,
    }));

    const collectionRows: TableSummaryResponse[] = collections.map(
      (collection) => ({
        id: collection.id,
        source: "collection",
        date: collection.issue_date,
        reference_number: collection.reference_number || "",
        name: `${collection.debtor.person.first_name} ${collection.debtor.person.last_name}`,
        amount: Number(collection.balance),
        status: collection.status,
      }),
    );

    const blockadeRows: TableSummaryResponse[] = blockades.map((blockade) => ({
      id: blockade.id,
      source: "blockade",
      date: blockade.createdAt,
      reference_number: blockade.reference_number,
      name: `${blockade.debtor.person.first_name} ${blockade.debtor.person.last_name}`,
      amount: Number(blockade.amount),
      status: blockade.status,
    }));

    return [...contractRows, ...collectionRows, ...blockadeRows]
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, limit);
  };
}
