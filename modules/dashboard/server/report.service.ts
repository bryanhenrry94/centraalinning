import { prisma } from "@/lib/prisma";
import { TableSummaryResponse } from "@/modules/dashboard/types/report.types";

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

      prisma.debtClaim.findMany({
        where: {
          tenantId,
        },
        select: {
          id: true,
          createdAt: true,
          reference: true,
          currentAmount: true,
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
          reason: true,
          originDebtClaim: {
            select: {
              reference: true,
              currentAmount: true,
              status: true,
            },
          },
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
      source: "FAR - Financiele afspraken registreren",
      date: contract.contract_date,
      reference_number: contract.reference_number,
      name: contract.parties.map((p) => p.fullname).join(" / "),
      amount: Number(contract.amount),
      status: contract.status,
    }));

    const collectionRows: TableSummaryResponse[] = collections.map(
      (collection: any) => ({
        id: collection.id,
        source: "AOP - Administrative opvolging",
        date: collection.createdAt,
        reference_number: collection.reference || "",
        name: `${collection.debtor.person.first_name} ${collection.debtor.person.last_name}`,
        amount: Number(collection.currentAmount),
        status: collection.status,
      }),
    );

    const blockadeRows: TableSummaryResponse[] = blockades.map((blockade: any) => ({
      id: blockade.id,
      source: "BLK - Blokade",
      date: blockade.createdAt,
      reference_number: blockade.originDebtClaim?.reference || blockade.reason || "",
      name: `${blockade.debtor.person.first_name} ${blockade.debtor.person.last_name}`,
      amount: Number(blockade.originDebtClaim?.currentAmount ?? 0),
      status: blockade.originDebtClaim?.status || "ACTIVE",
    }));

    return [...contractRows, ...collectionRows, ...blockadeRows]
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, limit);
  };
}
