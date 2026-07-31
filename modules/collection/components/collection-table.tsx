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
import HandshakeIcon from "@mui/icons-material/Handshake";
import GavelIcon from "@mui/icons-material/Gavel";
import { formatCurrency, formatDate } from "@/shared/utils/formatters";
import { DebtClaimResponse } from "@/modules/collection/services/collection.type";
import {
  DEBT_CLAIM_STATUS_CONFIG as STATUS_CONFIG,
  AOP_STEP_CONFIG,
  ChipColor,
} from "@/modules/collection/utils/debt-claim-status";
import { isAgreementPending } from "@/modules/agreement/constants/agreement-status";
import { TransferToLawyerDialog } from "@/modules/legal-process/components/transfer-to-lawyer-dialog";

const HEAD_SX = {
  backgroundColor: "secondary.main",
  color: "#fff",
  fontWeight: "bold",
  whiteSpace: "nowrap" as const,
  textAlign: "center" as const,
};

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50];

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
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);
  const [transferDebtClaimId, setTransferDebtClaimId] = React.useState<
    string | null
  >(null);

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
                  <TableCell align="center" sx={{ whiteSpace: "nowrap" }}>
                    <Chip
                      label={statusInfo.label}
                      color={statusInfo.color}
                      size="small"
                      sx={{ minWidth: 150 }}
                    />
                  </TableCell>
                  <TableCell align="center" sx={{ whiteSpace: "nowrap" }}>
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
                        {row.agreementStatus && (
                          <Tooltip
                            title={
                              isAgreementPending(row.agreementStatus)
                                ? "Betalingsregeling te beoordelen"
                                : "Betalingsregeling bekijken"
                            }
                          >
                            <IconButton
                              size="small"
                              color={
                                isAgreementPending(row.agreementStatus)
                                  ? "warning"
                                  : "default"
                              }
                              onClick={(e) => {
                                e.stopPropagation();
                                onReviewAgreement?.(row.id);
                              }}
                            >
                              <HandshakeIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {row.legalProcessId ? (
                          <Tooltip title="GOP-dossier bekijken">
                            <IconButton
                              size="small"
                              color="secondary"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(
                                  `/legal-processes/${row.legalProcessId}`,
                                );
                              }}
                            >
                              <GavelIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        ) : (
                          <Tooltip
                            title={
                              row.aopStep === "BLK_NOTIFICATION"
                                ? "Dossieroverdracht voor mogelijke gerechtelijke opvolging"
                                : "Dossieroverdracht voor mogelijke gerechtelijke opvolging (vereist AOP-fase Blokkade)"
                            }
                          >
                            <span>
                              <IconButton
                                size="small"
                                disabled={row.aopStep !== "BLK_NOTIFICATION"}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTransferDebtClaimId(row.id);
                                }}
                              >
                                <GavelIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        )}
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

      {transferDebtClaimId && (
        <TransferToLawyerDialog
          open={!!transferDebtClaimId}
          onClose={() => setTransferDebtClaimId(null)}
          debtClaimId={transferDebtClaimId}
          onTransferred={() => onRefresh?.()}
        />
      )}
    </Box>
  );
};

export default CollectionTable;
