"use client";

import React, { useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Chip,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
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
import MoreVertIcon from "@mui/icons-material/MoreVert";
import VisibilityIcon from "@mui/icons-material/Visibility";
import PaidIcon from "@mui/icons-material/Paid";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import HandshakeIcon from "@mui/icons-material/Handshake";
import GavelIcon from "@mui/icons-material/Gavel";
import GroupIcon from "@mui/icons-material/Group";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import { formatCurrency, formatDate } from "@/shared/utils/formatters";
import { DebtClaimResponse } from "@/modules/collection/services/collection.type";
import {
  DEBT_CLAIM_STATUS_CONFIG as STATUS_CONFIG,
  AOP_STEP_CONFIG,
  ChipColor,
} from "@/modules/collection/utils/debt-claim-status";
import { isAgreementPending } from "@/modules/agreement/constants/agreement-status";
import { TransferToLawyerDialog } from "@/modules/legal-process/components/transfer-to-lawyer-dialog";
import { StartCopDialog } from "@/modules/collective-follow-up/components/start-cop-dialog";

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
  const [startCopRow, setStartCopRow] = React.useState<DebtClaimResponse | null>(
    null,
  );
  const [menuAnchorEl, setMenuAnchorEl] = React.useState<HTMLElement | null>(
    null,
  );
  const [menuRow, setMenuRow] = React.useState<DebtClaimResponse | null>(null);

  const handleMenuOpen = useCallback(
    (e: React.MouseEvent<HTMLElement>, row: DebtClaimResponse) => {
      e.stopPropagation();
      setMenuAnchorEl(e.currentTarget);
      setMenuRow(row);
    },
    [],
  );

  const handleMenuClose = useCallback(() => {
    setMenuAnchorEl(null);
    setMenuRow(null);
  }, []);

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
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuOpen(e, row)}
                      >
                        <MoreVertIcon fontSize="small" />
                      </IconButton>
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

      {startCopRow && (
        <StartCopDialog
          open={!!startCopRow}
          onClose={() => setStartCopRow(null)}
          debtClaimId={startCopRow.id}
          principalAmount={Number(startCopRow.principalAmount) || 0}
          onStarted={(collectionId) => {
            setStartCopRow(null);
            router.push(`/collective-follow-up/${collectionId}`);
          }}
        />
      )}

      <Menu
        anchorEl={menuAnchorEl}
        open={!!menuAnchorEl}
        onClose={handleMenuClose}
        onClick={(e) => e.stopPropagation()}
      >
        {menuRow && [
          <MenuItem
            key="view"
            onClick={() => {
              handleView(menuRow.id);
              handleMenuClose();
            }}
          >
            <ListItemIcon>
              <VisibilityIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Bekijken</ListItemText>
          </MenuItem>,

          menuRow.agreementStatus && (
            <MenuItem
              key="agreement"
              onClick={() => {
                onReviewAgreement?.(menuRow.id);
                handleMenuClose();
              }}
            >
              <ListItemIcon>
                <HandshakeIcon
                  fontSize="small"
                  color={
                    isAgreementPending(menuRow.agreementStatus)
                      ? "warning"
                      : "inherit"
                  }
                />
              </ListItemIcon>
              <ListItemText>
                {isAgreementPending(menuRow.agreementStatus)
                  ? "Betalingsregeling te beoordelen"
                  : "Betalingsregeling bekijken"}
              </ListItemText>
            </MenuItem>
          ),

          menuRow.legalProcessId ? (
            <MenuItem
              key="gop"
              onClick={() => {
                router.push(`/legal-processes/${menuRow.legalProcessId}`);
                handleMenuClose();
              }}
            >
              <ListItemIcon>
                <GavelIcon fontSize="small" color="secondary" />
              </ListItemIcon>
              <ListItemText>GOP-dossier bekijken</ListItemText>
            </MenuItem>
          ) : (
            <MenuItem
              key="gop-transfer"
              disabled={menuRow.aopStep !== "BLK_NOTIFICATION"}
              onClick={() => {
                setTransferDebtClaimId(menuRow.id);
                handleMenuClose();
              }}
            >
              <ListItemIcon>
                <SwapHorizIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>
                Dossieroverdracht
                {menuRow.aopStep !== "BLK_NOTIFICATION" &&
                  " (vereist AOP-fase Blokkade)"}
              </ListItemText>
            </MenuItem>
          ),

          menuRow.collectiveCollectionId ? (
            <MenuItem
              key="cop"
              onClick={() => {
                router.push(
                  `/collective-follow-up/${menuRow.collectiveCollectionId}`,
                );
                handleMenuClose();
              }}
            >
              <ListItemIcon>
                <GroupIcon fontSize="small" color="secondary" />
              </ListItemIcon>
              <ListItemText>COP-dossier bekijken</ListItemText>
            </MenuItem>
          ) : (
            <MenuItem
              key="cop-start"
              disabled={menuRow.aopStep !== "BLK_NOTIFICATION"}
              onClick={() => {
                setStartCopRow(menuRow);
                handleMenuClose();
              }}
            >
              <ListItemIcon>
                <GroupIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>
                Collectieve Opvolging starten
                {menuRow.aopStep !== "BLK_NOTIFICATION" &&
                  " (vereist AOP-fase Blokkade)"}
              </ListItemText>
            </MenuItem>
          ),
        ]}
      </Menu>
    </Box>
  );
};

export default CollectionTable;
