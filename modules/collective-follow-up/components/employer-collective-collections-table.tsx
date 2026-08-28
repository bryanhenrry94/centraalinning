"use client";
import React, { useState } from "react";
import { Box, Button, Chip } from "@mui/material";
import HandshakeIcon from "@mui/icons-material/Handshake";

import { formatCurrency } from "@/shared/utils/formatters";
import { getCollectiveCollectionsForEmployerTenant } from "@/modules/collective-follow-up/actions/collective-collection.actions";
import { getCollectiveCollectionStatusInfo } from "@/modules/collective-follow-up/utils/collective-collection-status";
import { DebtorRequestAgreementDialog } from "@/modules/collective-follow-up/components/debtor-request-agreement-dialog";
import { ListColumn, ResponsiveListTable } from "@/shared/ui/responsive-list-table";

type CollectiveCollectionRow = Awaited<
  ReturnType<typeof getCollectiveCollectionsForEmployerTenant>
>[number];

const CAN_REQUEST_AGREEMENT_STATUSES = ["ACTIVE", "AWAITING_DEBTOR_RESPONSE"];

interface EmployerCollectiveCollectionsTableProps {
  collections: CollectiveCollectionRow[];
  onRequested: () => void;
}

// Expedientes de OTROS tenants donde el tenant logueado fue confirmado como
// empleador — puede presentar un acuerdo de pago en nombre del deudor una
// vez vencido el plazo de gracia (el guard server-side ya lo garantiza; acá
// solo se refleja en la UI). Reusa DebtorRequestAgreementDialog: el rol
// (deudor/empleador) lo determina el servidor, no un prop del cliente.
export const EmployerCollectiveCollectionsTable: React.FC<
  EmployerCollectiveCollectionsTableProps
> = ({ collections, onRequested }) => {
  const [selected, setSelected] = useState<CollectiveCollectionRow | null>(null);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);

  const gracePeriodPassed = (row: CollectiveCollectionRow) =>
    !!row.debtorGracePeriodDeadline && new Date(row.debtorGracePeriodDeadline) <= new Date();

  const columns: ListColumn<CollectiveCollectionRow>[] = [
    { key: "tenant", label: "Deelnemer (schuldeiser)", render: (row) => row.debtClaim.tenant.name },
    { key: "reference", label: "Referentie", render: (row) => row.debtClaim.reference || "-" },
    { key: "amount", label: "Bedrag", align: "right", render: (row) => formatCurrency(row.debtClaim.principalAmount) },
    {
      key: "status",
      label: "Status",
      render: (row) => {
        const statusInfo = getCollectiveCollectionStatusInfo(row.status);
        return <Chip label={statusInfo.label} color={statusInfo.color} size="small" />;
      },
    },
    {
      key: "actions",
      label: "Actie",
      render: (row) => (
        <Box sx={{ display: "flex", justifyContent: "center" }}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<HandshakeIcon fontSize="small" />}
            disabled={!CAN_REQUEST_AGREEMENT_STATUSES.includes(row.status) || !gracePeriodPassed(row)}
            onClick={(e) => {
              e.stopPropagation();
              setSelected(row);
              setRequestDialogOpen(true);
            }}
          >
            Namens medewerker aanvragen
          </Button>
        </Box>
      ),
    },
  ];

  return (
    <>
      <ResponsiveListTable
        columns={columns}
        rows={collections}
        getRowKey={(row) => row.id}
        getRowHref={(row) => `/collective-follow-up/${row.id}`}
        emptyMessage="Geen dossiers gevonden."
      />

      {selected && (
        <DebtorRequestAgreementDialog
          open={requestDialogOpen}
          onClose={() => setRequestDialogOpen(false)}
          collectionId={selected.id}
          outstandingAmount={Number(selected.debtClaim.principalAmount)}
          onRequested={onRequested}
        />
      )}
    </>
  );
};
