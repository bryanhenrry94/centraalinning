import { prisma } from "@/lib/prisma";
import { TableSummaryResponse } from "@/modules/dashboard/types/report.types";
import {
  getContractStatusLabel,
  getContractStatusColor,
} from "@/modules/contract/utils/contract-status";
import { getDebtClaimStatusInfo } from "@/modules/collection/utils/debt-claim-status";

export type DocumentFilter = "open" | "completed" | "all";

export const OPEN_DEBT_CLAIM_STATUSES = ["OPEN", "IN_PROGRESS"] as const;
export const COMPLETED_DEBT_CLAIM_STATUSES = ["SETTLED", "CLOSED"] as const;

const OPEN_LEGAL_PROCESS_STATUSES = ["DRAFT", "ACTIVE", "ON_HOLD"] as const;
const COMPLETED_LEGAL_PROCESS_STATUSES = ["COMPLETED"] as const;

const LEGAL_PROCESS_STATUS_CONFIG: Record<
  string,
  { label: string; color: TableSummaryResponse["statusColor"] }
> = {
  DRAFT: { label: "Concept", color: "default" },
  ACTIVE: { label: "In behandeling", color: "info" },
  ON_HOLD: { label: "Aangehouden", color: "warning" },
  COMPLETED: { label: "Voltooid", color: "success" },
  CANCELLED: { label: "Geannuleerd", color: "error" },
};

function getLegalProcessStatusInfo(status: string) {
  return (
    LEGAL_PROCESS_STATUS_CONFIG[status] ?? {
      label: status,
      color: "default" as TableSummaryResponse["statusColor"],
    }
  );
}

export class ReportService {
  static getTableSummary = async (
    tenantId: string,
    limit: number = 5,
  ): Promise<TableSummaryResponse[]> => {
    return ReportService.getDocuments(tenantId, { limit });
  };

  static getOpenDocuments = async (
    tenantId: string,
  ): Promise<TableSummaryResponse[]> => {
    return ReportService.getDocuments(tenantId, { filter: "open" });
  };

  static getCompletedDocuments = async (
    tenantId: string,
  ): Promise<TableSummaryResponse[]> => {
    return ReportService.getDocuments(tenantId, { filter: "completed" });
  };

  static getDocuments = async (
    tenantId: string,
    options: { limit?: number; filter?: DocumentFilter } = {},
  ): Promise<TableSummaryResponse[]> => {
    const { limit, filter = "all" } = options;

    // Contracten (FAR) kennen geen "afgerond"-status (alleen DRAFT/REGISTERED),
    // dus ze horen enkel thuis in de open/alle weergave, nooit bij "afgerond".
    const includeContracts = filter !== "completed";

    const debtClaimStatusFilter =
      filter === "open"
        ? { status: { in: [...OPEN_DEBT_CLAIM_STATUSES] } }
        : filter === "completed"
          ? { status: { in: [...COMPLETED_DEBT_CLAIM_STATUSES] } }
          : {};

    const legalProcessStatusFilter =
      filter === "open"
        ? { status: { in: [...OPEN_LEGAL_PROCESS_STATUSES] } }
        : filter === "completed"
          ? { status: { in: [...COMPLETED_LEGAL_PROCESS_STATUSES] } }
          : {};

    const [contracts, collections, legalProcesses] = await Promise.all([
      includeContracts
        ? prisma.contract.findMany({
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
          })
        : Promise.resolve([]),

      prisma.debtClaim.findMany({
        where: {
          tenantId,
          ...debtClaimStatusFilter,
        },
        select: {
          id: true,
          createdAt: true,
          reference: true,
          status: true,
          principalAmount: true,
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

      prisma.legalProcess.findMany({
        where: {
          debtClaim: { tenantId },
          ...legalProcessStatusFilter,
        },
        select: {
          id: true,
          startedAt: true,
          status: true,
          debtClaim: {
            select: {
              id: true,
              reference: true,
              principalAmount: true,
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
          },
        },
      }),
    ]);

    const contractRows: TableSummaryResponse[] = contracts.map((contract) => {
      return {
        id: contract.id,
        source: "FAR - Financiele afspraken registreren",
        date: contract.contract_date,
        reference_number: contract.reference_number,
        name: contract.parties.map((p) => p.fullname).join(" / "),
        amount: Number(contract.amount),
        status: getContractStatusLabel(contract.status),
        statusColor: getContractStatusColor(contract.status) ?? "default",
        href: `/contracts/${contract.id}`,
      };
    });

    const collectionRows: TableSummaryResponse[] = collections.map(
      (collection: any) => {
        const statusInfo = getDebtClaimStatusInfo(collection.status);

        return {
          id: collection.id,
          source: "AOP - Administrative opvolging",
          date: collection.createdAt,
          reference_number: collection.reference || "",
          name: `${collection.debtor.person.first_name} ${collection.debtor.person.last_name}`,
          amount: Number(collection.principalAmount),
          status: statusInfo.label,
          statusColor: statusInfo.color,
          href: `/collections/${collection.id}`,
        };
      },
    );

    const legalProcessRows: TableSummaryResponse[] = legalProcesses.map(
      (legalProcess: any) => {
        const statusInfo = getLegalProcessStatusInfo(legalProcess.status);

        return {
          id: legalProcess.id,
          source: "GOP - Gerechtelijke opvolging",
          date: legalProcess.startedAt,
          reference_number: legalProcess.debtClaim?.reference || "",
          name: `${legalProcess.debtClaim.debtor.person.first_name} ${legalProcess.debtClaim.debtor.person.last_name}`,
          amount: Number(legalProcess.debtClaim?.principalAmount ?? 0),
          status: statusInfo.label,
          statusColor: statusInfo.color,
          href: `/collections/${legalProcess.debtClaim.id}`,
        };
      },
    );

    const rows = [
      ...contractRows,
      ...collectionRows,
      ...legalProcessRows,
    ].sort((a, b) => b.date.getTime() - a.date.getTime());

    return limit ? rows.slice(0, limit) : rows;
  };
}
