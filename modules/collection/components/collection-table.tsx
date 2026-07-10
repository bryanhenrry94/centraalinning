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
  Tooltip,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import TablePagination from "@mui/material/TablePagination";
import VisibilityIcon from "@mui/icons-material/Visibility";
import PaidIcon from "@mui/icons-material/Paid";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { formatCurrency, formatDate } from "@/shared/utils/formatters";
import { DebtClaimResponse } from "@/modules/collection/services/collection.type";
import { AopStep } from "@/modules/collection/services/collection.validators";

type ChipColor =
  | "default"
  | "primary"
  | "warning"
  | "info"
  | "error"
  | "success";

const STATUS_CONFIG: Record<string, { label: string; color: ChipColor }> = {
  OPEN: { label: "Wacht op betaling", color: "primary" },
  IN_PROGRESS: { label: "In behandeling", color: "info" },
  SETTLED: { label: "Vereffend", color: "success" },
  CLOSED: { label: "Gesloten", color: "default" },
  CANCELLED: { label: "Geannuleerd", color: "error" },
};

const AOP_STEP_CONFIG: Record<AopStep, { label: string; color: ChipColor }> = {
  REMINDER: { label: "Aanmaning", color: "info" },
  FINAL_NOTICE: { label: "Sommatie", color: "warning" },
  DEFAULT_NOTICE: { label: "Ingebrekestelling", color: "error" },
  BLK_NOTIFICATION: { label: "Blokkade", color: "error" },
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
    (id: string) => router.push(`/collections/${id}`),
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
                  Saldo
                </TableCell>
              )}
              <TableCell sx={HEAD_SX}>Status</TableCell>
              <TableCell sx={HEAD_SX}>Fase</TableCell>
              <TableCell sx={{ ...HEAD_SX, textAlign: "center" }}>
                Actie
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedData.map((row) => {
              const statusInfo = STATUS_CONFIG[row.status] ?? {
                label: row.status,
                color: "default" as ChipColor,
              };
              const aopInfo = row.aopStep ? AOP_STEP_CONFIG[row.aopStep] : null;
              const isPending = row.status === "OPEN";

              return (
                <TableRow
                  key={row.id}
                  hover
                  // onClick={() => handleView(row.id)}
                  sx={{ cursor: "pointer", opacity: isPending ? 0.75 : 1 }}
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
                      {isPending
                        ? "—"
                        : formatCurrency(Number(row.principalAmount))}
                    </TableCell>
                  )}
                  <TableCell>
                    <Chip
                      label={statusInfo.label}
                      color={statusInfo.color}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {aopInfo ? (
                      <Chip
                        label={aopInfo.label}
                        color={aopInfo.color}
                        size="small"
                        variant="outlined"
                      />
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell align="center">
                    {isPending ? (
                      row.paymentLink ? (
                        <Tooltip title="Link de pago pendiente">
                          <IconButton
                            size="small"
                            component="a"
                            href={row.paymentLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            color="primary"
                            onClick={(e: React.MouseEvent) =>
                              e.stopPropagation()
                            }
                          >
                            <OpenInNewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      ) : (
                        <Tooltip title="Wacht op betalingsbevestiging">
                          <HourglassEmptyIcon
                            fontSize="small"
                            color="disabled"
                          />
                        </Tooltip>
                      )
                    ) : (
                      <>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleView(row.id);
                          }}
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </>
                    )}
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
