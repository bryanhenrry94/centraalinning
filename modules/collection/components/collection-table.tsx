"use client";

import React, { useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import TablePagination from "@mui/material/TablePagination";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { formatCurrency, formatDate } from "@/shared/utils/formatters";
import { DebtClaimResponse } from "@/modules/collection/services/collection.type";

type StatusColor = "default" | "warning" | "info" | "error" | "success";

const STATUS_CONFIG: Record<string, { label: string; color: StatusColor }> = {
  OPEN: { label: "Open", color: "default" },
  IN_PROGRESS: { label: "In behandeling", color: "info" },
  SETTLED: { label: "Vereffend", color: "success" },
  CLOSED: { label: "Gesloten", color: "warning" },
  CANCELLED: { label: "Geannuleerd", color: "error" },
};

const HEAD_SX = {
  backgroundColor: "secondary.main",
  color: "#fff",
  fontWeight: "bold",
  whiteSpace: "nowrap" as const,
};

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50];

const CollectionTable = ({ invoices }: { invoices: DebtClaimResponse[] }) => {
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);

  const paginatedData = useMemo(
    () => invoices.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [invoices, page, rowsPerPage],
  );

  const handleView = useCallback(
    (id: string) => router.push(`/dashboard/collections/${id}`),
    [router],
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
      <TableContainer>
        <Table size="small" stickyHeader aria-label="collection table">
          <TableHead>
            <TableRow>
              <TableCell sx={HEAD_SX}>Datum</TableCell>
              {!isMobile && <TableCell sx={HEAD_SX}>Referentie</TableCell>}
              <TableCell sx={{ ...HEAD_SX, minWidth: 150 }}>Naam</TableCell>
              <TableCell sx={{ ...HEAD_SX, textAlign: "right" }}>
                Vordering
              </TableCell>
              {!isMobile && (
                <TableCell sx={{ ...HEAD_SX, textAlign: "right" }}>
                  Open
                </TableCell>
              )}
              <TableCell sx={HEAD_SX}>Status</TableCell>
              <TableCell sx={{ ...HEAD_SX, textAlign: "center" }}>
                Actie
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedData.map((row) => {
              const statusInfo = STATUS_CONFIG[row.status] ?? {
                label: row.status,
                color: "default" as StatusColor,
              };

              return (
                <TableRow
                  key={row.id}
                  hover
                  onClick={() => handleView(row.id)}
                  sx={{ cursor: "pointer" }}
                >
                  <TableCell sx={{ whiteSpace: "nowrap" }}>
                    {formatDate(row.createdAt?.toString() ?? "")}
                  </TableCell>
                  {!isMobile && <TableCell>{row.reference ?? "—"}</TableCell>}
                  <TableCell>{row.debtor.fullname || "Onbekend"}</TableCell>
                  <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                    {formatCurrency(Number(row.principalAmount))}
                  </TableCell>
                  {!isMobile && (
                    <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                      {formatCurrency(Number(row.currentAmount))}
                    </TableCell>
                  )}
                  <TableCell>
                    <Chip
                      label={statusInfo.label}
                      color={statusInfo.color}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleView(row.id);
                      }}
                    >
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
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
