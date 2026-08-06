"use client";
import React, { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  Box,
  Button,
  Chip,
  Container,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import HandshakeIcon from "@mui/icons-material/Handshake";
import { useRouter } from "next/navigation";

import { formatCurrency } from "@/shared/utils/formatters";
import { notifyError } from "@/shared/ui/notifications";
import { getDebtorByUserId } from "@/modules/collection/actions/debtor.actions";
import { getCollectiveCollectionsForDebtor } from "@/modules/collective-follow-up/actions/collective-collection.actions";
import { getCollectiveCollectionStatusInfo } from "@/modules/collective-follow-up/utils/collective-collection-status";
import { DebtorRequestAgreementDialog } from "@/modules/collective-follow-up/components/debtor-request-agreement-dialog";

type CollectiveCollectionRow = Awaited<
  ReturnType<typeof getCollectiveCollectionsForDebtor>
>[number];

const CAN_REQUEST_AGREEMENT_STATUSES = ["ACTIVE", "AWAITING_DEBTOR_RESPONSE"];

export const DebtorCollectiveCollectionsView = () => {
  const { data: session } = useSession();
  const router = useRouter();
  const user = session?.user;

  const [collections, setCollections] = useState<CollectiveCollectionRow[]>([]);
  const [selected, setSelected] = useState<CollectiveCollectionRow | null>(null);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);

  const fetchCollections = useCallback(async () => {
    if (!user?.id || !user?.tenant_id) return;

    try {
      const debtor = await getDebtorByUserId(user.id, user.tenant_id);
      if (!debtor) {
        notifyError("Geen debiteur gevonden voor deze gebruiker");
        return;
      }

      const data = await getCollectiveCollectionsForDebtor(debtor.id);
      setCollections(data);
    } catch (error) {
      console.error("Error fetching collective collections:", error);
      notifyError("Fout bij het ophalen van collectieve opvolgingen");
    }
  }, [user?.id, user?.tenant_id]);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  const openRequestDialog = (row: CollectiveCollectionRow) => {
    setSelected(row);
    setRequestDialogOpen(true);
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ mt: { xs: 1.5, sm: 4 }, mb: 2 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
          Collectieve Opvolging
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Bekijk uw collectieve opvolgingen of vraag een betalingsregeling aan om een
          gerechtelijke procedure te voorkomen.
        </Typography>
      </Box>

      <TableContainer component={Paper} sx={{ mt: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {["Deelnemer", "Referentie", "Bedrag", "Status", "Actie"].map((col) => (
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
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<HandshakeIcon fontSize="small" />}
                      disabled={!CAN_REQUEST_AGREEMENT_STATUSES.includes(row.status)}
                      onClick={(e) => {
                        e.stopPropagation();
                        openRequestDialog(row);
                      }}
                    >
                      Aanvragen
                    </Button>
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
          onRequested={fetchCollections}
        />
      )}
    </Container>
  );
};
