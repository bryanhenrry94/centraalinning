"use client";

import React, { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  IconButton,
  Menu,
  MenuItem,
  TablePagination,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import {
  ListColumn,
  ResponsiveListTable,
} from "@/shared/ui/responsive-list-table";
import { StatusChip } from "@/shared/ui/status-chip";
import { formatCurrency, formatDate } from "@/shared/utils/formatters";
import { DebtClaimActionsMenu } from "@/modules/collection/components/debt-claim-actions-menu";
import { DossierRow } from "@/modules/dossier/types/dossier.types";
import { BlcResultDialog } from "@/modules/dossier/components/blc-result-dialog";

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50];

interface RowActionItem {
  label: string;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
}

// Menú genérico para servicios con pocas acciones (FAR/BLK) — para AOP/COP/GOP
// se reutiliza DebtClaimActionsMenu directamente (ver abajo).
const RowActionsMenu = ({ items }: { items: RowActionItem[] }) => {
  const router = useRouter();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  return (
    <>
      <IconButton
        size="small"
        onClick={(e) => {
          e.stopPropagation();
          setAnchorEl(e.currentTarget);
        }}
      >
        <MoreVertIcon fontSize="small" />
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={!!anchorEl}
        onClose={() => setAnchorEl(null)}
        onClick={(e) => e.stopPropagation()}
      >
        {items.map((item) => (
          <MenuItem
            key={item.label}
            disabled={item.disabled}
            onClick={() => {
              setAnchorEl(null);
              if (item.onClick) item.onClick();
              else if (item.href) router.push(item.href);
            }}
          >
            {item.label}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

interface DossierTableProps {
  rows: DossierRow[];
  onReviewAgreement?: (debtClaimId: string) => void;
  onRefresh?: () => void;
}

export const DossierTable = ({
  rows,
  onReviewAgreement,
  onRefresh,
}: DossierTableProps) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [blcRow, setBlcRow] = useState<DossierRow | null>(null);

  const paginatedRows = useMemo(
    () => rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [rows, page, rowsPerPage],
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

  const columns: ListColumn<DossierRow>[] = [
    {
      key: "date",
      label: "Datum",
      render: (r) => formatDate(r.date.toString()),
    },
    {
      key: "reference",
      label: "Referentie",
      align: "left",
      hideOnMobile: true,
      render: (r) => r.reference,
    },
    {
      key: "debtor",
      label: "Debiteur",
      align: "left",
      render: (r) => r.debtorName,
    },
    {
      key: "claimed",
      label: "Vordering",
      align: "right",
      render: (r) =>
        r.claimed !== undefined ? formatCurrency(r.claimed) : "-",
    },
    {
      key: "paid",
      label: "Betaald",
      align: "right",
      hideOnMobile: true,
      render: (r) => (r.paid !== undefined ? formatCurrency(r.paid) : "-"),
    },
    {
      key: "outstanding",
      label: "Nog te betalen",
      align: "right",
      hideOnMobile: true,
      render: (r) =>
        r.outstanding !== undefined ? formatCurrency(r.outstanding) : "-",
    },
    {
      key: "status",
      label: "Status",
      align: "center",
      render: (r) => (
        <StatusChip
          label={r.statusLabel}
          color={r.statusColor}
          size="small"
          sx={{ minWidth: 150, borderRadius: 1 }}
        />
      ),
    },
    {
      key: "actions",
      label: "Actie",
      align: "center",
      render: (r) => {
        if (r.debtClaim) {
          return (
            <DebtClaimActionsMenu
              row={r.debtClaim}
              onReviewAgreement={onReviewAgreement}
              onRefresh={onRefresh}
              detailHref={r.detailHref}
            />
          );
        }

        if (r.serviceType === "FAR") {
          const items: RowActionItem[] = [];
          if (r.farEligibleForFollowUp) {
            items.push({
              label: "Vervolgen (AOP starten)",
              // r.detailHref ya trae su propio ?type=FAR — agregar con & para
              // no romper la query string.
              href: `${r.detailHref}&action=vervolgen`,
            });
          }
          items.push({ label: "Ver detalle", href: r.detailHref });
          return <RowActionsMenu items={items} />;
        }

        if (r.serviceType === "BLC") {
          return (
            <RowActionsMenu
              items={[{ label: "Bekijken", onClick: () => setBlcRow(r) }]}
            />
          );
        }

        // BLK standalone
        return (
          <RowActionsMenu
            items={[{ label: "Ver detalle", href: r.detailHref }]}
          />
        );
      },
    },
  ];

  return (
    <Box sx={{ width: "100%", overflow: "hidden" }}>
      <ResponsiveListTable
        columns={columns}
        rows={paginatedRows}
        getRowKey={(r) => `${r.serviceType}-${r.id}`}
        emptyMessage="Geen dossiers gevonden."
        dense
      />
      <TablePagination
        component="div"
        count={rows.length}
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

      {blcRow && (
        <BlcResultDialog
          row={blcRow}
          open={!!blcRow}
          onClose={() => setBlcRow(null)}
          onInvited={() => {
            setBlcRow(null);
            onRefresh?.();
          }}
        />
      )}
    </Box>
  );
};
