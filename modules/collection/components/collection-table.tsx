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
  Tooltip,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import TablePagination from "@mui/material/TablePagination";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import VisibilityIcon from "@mui/icons-material/Visibility";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import HandshakeIcon from "@mui/icons-material/Handshake";
import GavelIcon from "@mui/icons-material/Gavel";
import GroupIcon from "@mui/icons-material/Group";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
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
import { isAgreementPending } from "@/modules/agreement/constants/agreement-status";
import { TransferToLawyerDialog } from "@/modules/legal-process/components/transfer-to-lawyer-dialog";
import { StartCopDialog } from "@/modules/collective-follow-up/components/start-cop-dialog";

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
            render: (row) =>
              dim(row.reference ?? "—", row.status === "OPEN"),
          },
          {
            key: "name",
            label: "Naam",
            render: (row) =>
              dim(row.debtor.fullname || "Onbekend", row.status === "OPEN"),
          },
          {
            key: "amount",
            label: "Vordering",
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
              const aopInfo = row.aopStep
                ? AOP_STEP_CONFIG[row.aopStep]
                : null;

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
            render: (row) => {
              const isPending = row.status === "OPEN";

              if (!isPending) {
                return (
                  <IconButton
                    size="small"
                    onClick={(e) => handleMenuOpen(e, row)}
                  >
                    <MoreVertIcon fontSize="small" />
                  </IconButton>
                );
              }

              return row.paymentLink ? (
                <Tooltip title="Link de pago pendiente">
                  <IconButton
                    size="small"
                    component="a"
                    href={row.paymentLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    color="primary"
                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
                  >
                    <OpenInNewIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              ) : (
                <Tooltip title="Wacht op betalingsbevestiging">
                  <HourglassEmptyIcon fontSize="small" color="disabled" />
                </Tooltip>
              );
            },
          },
        ];

        return (
          <ResponsiveListTable
            columns={columns}
            rows={paginatedData}
            getRowKey={(row) => row.id}
            emptyMessage="Geen vorderingen gevonden."
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
