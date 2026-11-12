"use client";

import React, { useMemo, useCallback } from "react";
import { Box, Chip, useMediaQuery, useTheme } from "@mui/material";
import TablePagination from "@mui/material/TablePagination";
import {
  ListColumn,
  ResponsiveListTable,
} from "@/shared/ui/responsive-list-table";
import { formatCurrency, formatDate } from "@/shared/utils/formatters";
import { DebtClaimResponse } from "@/modules/collection/services/collection.type";
import {
  DEBT_CLAIM_STATUS_CONFIG as STATUS_CONFIG,
  AOP_STEP_CONFIG,
  ChipColor,
} from "@/modules/collection/utils/debt-claim-status";
import { DebtClaimActionsMenu } from "@/modules/collection/components/debt-claim-actions-menu";

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50];

// Atenúa la fila/card completa mientras el pago inicial sigue pendiente
// (status OPEN) — antes era un `opacity` en el <TableRow>; acá se aplica
// por celda porque ResponsiveListTable no expone estilo a nivel de fila.
const dim = (node: React.ReactNode, isPending: boolean): React.ReactNode =>
  isPending ? <Box sx={{ opacity: 0.75 }}>{node}</Box> : node;

interface CollectionTableProps {
  invoices: DebtClaimResponse[];
  onReviewAgreement?: (debtClaimId: string) => void;
  onRefresh?: () => void;
}

const CollectionTable = ({
  invoices,
  onReviewAgreement,
  onRefresh,
}: CollectionTableProps) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);

  const paginatedData = useMemo(
    () => invoices.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [invoices, page, rowsPerPage],
  );

  const handlePageChange = useCallback((_: unknown, newPage: number) => {
    setPage(newPage);
  }, []);

  const handleRowsPerPageChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setRowsPerPage(parseInt(e.target.value, 10));
      setPage(0);
    },
    [],
  );

  return (
    <Box sx={{ width: "100%", overflow: "hidden" }}>
      {(() => {
        const columns: ListColumn<DebtClaimResponse>[] = [
          {
            key: "date",
            label: "Datum",
            render: (row) =>
              dim(
                formatDate(row.createdAt?.toString() ?? ""),
                row.status === "OPEN",
              ),
          },
          {
            key: "reference",
            label: "Referentie",
            hideOnMobile: true,
            render: (row) => dim(row.reference ?? "—", row.status === "OPEN"),
          },
          {
            key: "name",
            label: "Naam",
            render: (row) =>
              dim(row.debtor.fullname || "Onbekend", row.status === "OPEN"),
          },
          {
            key: "amount",
            label: "Openstaande vordering",
            align: "right",
            render: (row) =>
              dim(
                formatCurrency(Number(row.principalAmount)),
                row.status === "OPEN",
              ),
          },
          {
            key: "balance",
            label: "Saldo",
            align: "right",
            hideOnMobile: true,
            render: (row) =>
              row.status === "OPEN"
                ? "—"
                : formatCurrency(
                    row.receivableBalance ?? Number(row.principalAmount),
                  ),
          },
          {
            key: "status",
            label: "Status",
            align: "center",
            render: (row) => {
              const statusInfo = STATUS_CONFIG[row.status] ?? {
                label: row.status,
                color: "default" as ChipColor,
              };

              return (
                <Chip
                  label={statusInfo.label}
                  color={statusInfo.color}
                  size="small"
                  sx={{ minWidth: 150 }}
                />
              );
            },
          },
          {
            key: "phase",
            label: "Fase",
            align: "center",
            render: (row) => {
              const aopInfo = row.aopStep ? AOP_STEP_CONFIG[row.aopStep] : null;

              return aopInfo ? (
                <Chip
                  label={aopInfo.label}
                  color={aopInfo.color}
                  size="small"
                  variant="outlined"
                />
              ) : (
                "—"
              );
            },
          },
          {
            key: "actions",
            label: "Actie",
            align: "center",
            render: (row) => (
              <DebtClaimActionsMenu
                row={row}
                onReviewAgreement={onReviewAgreement}
                onRefresh={onRefresh}
              />
            ),
          },
        ];

        return (
          <ResponsiveListTable
            columns={columns}
            rows={paginatedData}
            getRowKey={(row) => row.id}
            emptyMessage="Geen vorderingen gevonden."
            dense
          />
        );
      })()}
      <TablePagination
        component="div"
        count={invoices.length}
        page={page}
        onPageChange={handlePageChange}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleRowsPerPageChange}
        rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
        labelRowsPerPage={isMobile ? "" : "Rijen per pagina:"}
        labelDisplayedRows={({ from, to, count }) =>
          `${from}–${to} van ${count}`
        }
      />
    </Box>
  );
};

export default CollectionTable;
