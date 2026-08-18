"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Button,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import HandshakeIcon from "@mui/icons-material/Handshake";

import { formatCurrency } from "@/shared/utils/formatters";
import { getCollectiveCollectionsForEmployerTenant } from "@/modules/collective-follow-up/actions/collective-collection.actions";
import { getCollectiveCollectionStatusInfo } from "@/modules/collective-follow-up/utils/collective-collection-status";
import { DebtorRequestAgreementDialog } from "@/modules/collective-follow-up/components/debtor-request-agreement-dialog";

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
  const router = useRouter();
  const [selected, setSelected] = useState<CollectiveCollectionRow | null>(null);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);

  const gracePeriodPassed = (row: CollectiveCollectionRow) =>
    !!row.debtorGracePeriodDeadline && new Date(row.debtorGracePeriodDeadline) <= new Date();

  return (
    <>
      <TableContainer component={Paper} sx={{ mt: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {["Deelnemer (schuldeiser)", "Referentie", "Bedrag", "Status", "Actie"].map((col) => (
                <TableCell
                  key={col}
                  align="center"
                  sx={{ backgroundColor: "secondary.main", color: "#fff", fontWeight: "bold" }}
                >
                  {col}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {collections.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ fontStyle: "italic" }}>
                  Geen dossiers gevonden.
                </TableCell>
              </TableRow>
            )}
            {collections.map((row) => {
              const statusInfo = getCollectiveCollectionStatusInfo(row.status);
              return (
                <TableRow
                  key={row.id}
                  hover
                  sx={{ cursor: "pointer" }}
                  onClick={() => router.push(`/collective-follow-up/${row.id}`)}
                >
                  <TableCell>{row.debtClaim.tenant.name}</TableCell>
                  <TableCell align="center">{row.debtClaim.reference || "-"}</TableCell>
                  <TableCell align="right">{formatCurrency(row.debtClaim.principalAmount)}</TableCell>
                  <TableCell align="center">
                    <Chip label={statusInfo.label} color={statusInfo.color} size="small" />
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: "flex", gap: 1, justifyContent: "center" }}>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<HandshakeIcon fontSize="small" />}
                        disabled={
                          !CAN_REQUEST_AGREEMENT_STATUSES.includes(row.status) ||
                          !gracePeriodPassed(row)
                        }
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelected(row);
                          setRequestDialogOpen(true);
                        }}
                      >
                        Namens medewerker aanvragen
                      </Button>
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {selected && (
        <DebtorRequestAgreementDialog
          open={requestDialogOpen}
          onClose={() => setRequestDialogOpen(false)}
          collectionId={selected.id}
          onRequested={onRequested}
        />
      )}
    </>
  );
};
