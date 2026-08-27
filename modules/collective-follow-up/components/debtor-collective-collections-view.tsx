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
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import { useRouter } from "next/navigation";

import { formatCurrency, formatDate } from "@/shared/utils/formatters";
import { notifyError } from "@/shared/ui/notifications";
import { getDebtorByUserId, getDebts } from "@/modules/collection/actions/debtor.actions";
import { DebtorSummary } from "@/modules/collection/types/DebtorSummary";
import { getCollectiveCollectionsForDebtor } from "@/modules/collective-follow-up/actions/collective-collection.actions";
import { getCollectiveCollectionStatusInfo } from "@/modules/collective-follow-up/utils/collective-collection-status";
import { DebtorRequestAgreementDialog } from "@/modules/collective-follow-up/components/debtor-request-agreement-dialog";
import { TransferPaymentDialog } from "@/modules/payment/components/transfer-payment-dialog";

type CollectiveCollectionRow = Awaited<
  ReturnType<typeof getCollectiveCollectionsForDebtor>
>[number];

const CAN_REQUEST_AGREEMENT_STATUSES = ["ACTIVE", "AWAITING_DEBTOR_RESPONSE"];
// Mismos estados "abiertos" que OPEN_COLLECTIVE_COLLECTION_STATUSES en
// modules/collective-follow-up/constants/collective-collection-status.ts —
// duplicado como string[] porque ese archivo reexporta un enum de
// @prisma/client y este es un componente "use client".
const CAN_PAY_STATUSES = ["ACTIVE", "AWAITING_DEBTOR_RESPONSE", "PAYMENT_AGREEMENT_REQUESTED"];

export const DebtorCollectiveCollectionsView = () => {
  const { data: session } = useSession();
  const router = useRouter();
  const user = session?.user;

  const [collections, setCollections] = useState<CollectiveCollectionRow[]>([]);
  const [debts, setDebts] = useState<DebtorSummary[]>([]);
  const [debtorEmail, setDebtorEmail] = useState("");
  const [selected, setSelected] = useState<CollectiveCollectionRow | null>(null);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [payDialogOpen, setPayDialogOpen] = useState(false);

  const fetchCollections = useCallback(async () => {
    if (!user?.id || !user?.tenant_id) return;

    try {
      const debtor = await getDebtorByUserId(user.id, user.tenant_id);
      if (!debtor) {
        notifyError("Geen debiteur gevonden voor deze gebruiker");
        return;
      }

      const [data, debtsResult] = await Promise.all([
        getCollectiveCollectionsForDebtor(debtor.id),
        getDebts({ debtor_id: debtor.id }),
      ]);
      setCollections(data);
      setDebts(debtsResult.data ?? []);
      setDebtorEmail(debtor.email ?? "");
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

  const openPayDialog = (row: CollectiveCollectionRow) => {
    setSelected(row);
    setPayDialogOpen(true);
  };

  const selectedDebt = selected ? debts.find((d) => d.id === selected.debtClaimId) ?? null : null;

  // Consecuencia concreta del plazo de gracia: una vez vencido, si ya hay
  // un empleador confirmado, el deudor deja de poder solicitar el acuerdo
  // directamente — pasa a gestionarse vía el empleador (ver
  // requireDebtorOrEmployerForNegotiation).
  const canDebtorRequestAgreement = (row: CollectiveCollectionRow) => {
    if (!CAN_REQUEST_AGREEMENT_STATUSES.includes(row.status)) return false;
    const gracePeriodPassed =
      !!row.debtorGracePeriodDeadline && new Date(row.debtorGracePeriodDeadline) <= new Date();
    return !(gracePeriodPassed && row.employerTenantId);
  };

  // Zelfde consequentie als hierboven, maar dan voor het rechtstreeks
  // betalen — vanaf het verstrijken van de bedenktermijn met bevestigde
  // werkgever verloopt ook betalen exclusief via de werkgever (zie
  // CollectiveCollectionService.assertDebtorPaymentAllowed, de
  // gezaghebbende controle zit server-side).
  const canDebtorPay = (row: CollectiveCollectionRow) => {
    if (!CAN_PAY_STATUSES.includes(row.status)) return false;
    const gracePeriodPassed =
      !!row.debtorGracePeriodDeadline && new Date(row.debtorGracePeriodDeadline) <= new Date();
    return !(gracePeriodPassed && row.employerTenantId);
  };

  // Begeleide tekst per dossier (feedback sponsor, sectie 8): de deudor moet
  // de vervaldatum en zijn opties direct zien, niet zelf de tabelkolommen
  // hoeven interpreteren.
  const getDebtorGuidanceText = (row: CollectiveCollectionRow): string | null => {
    if (!row.debtorGracePeriodDeadline) return null;
    const gracePeriodPassed = new Date(row.debtorGracePeriodDeadline) <= new Date();

    if (!gracePeriodPassed) {
      return `U heeft tot ${formatDate(
        row.debtorGracePeriodDeadline.toString(),
      )} om het volledige bedrag te betalen of een betalingsregeling aan te vragen.`;
    }

    if (row.employerTenantId) {
      return `De bedenktermijn is verstreken. ${
        row.employerTenant?.name ?? "Uw werkgever"
      } behartigt deze regeling nu namens u.`;
    }

    return null;
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
              const guidanceText = getDebtorGuidanceText(row);
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
                        startIcon={<AccountBalanceIcon fontSize="small" />}
                        disabled={!canDebtorPay(row)}
                        onClick={(e) => {
                          e.stopPropagation();
                          openPayDialog(row);
                        }}
                      >
                        Betalen
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<HandshakeIcon fontSize="small" />}
                        disabled={!canDebtorRequestAgreement(row)}
                        onClick={(e) => {
                          e.stopPropagation();
                          openRequestDialog(row);
                        }}
                      >
                        Aanvragen
                      </Button>
                    </Box>
                    {guidanceText && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: "block", mt: 0.75, textAlign: "left" }}
                      >
                        {guidanceText}
                      </Typography>
                    )}
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
          outstandingAmount={selectedDebt?.debtor_to_participant_balance ?? 0}
          onRequested={fetchCollections}
        />
      )}

      {selected && (
        <TransferPaymentDialog
          open={payDialogOpen}
          onClose={() => setPayDialogOpen(false)}
          debt={selectedDebt}
          debtorEmail={debtorEmail}
          onSuccess={fetchCollections}
        />
      )}
    </Container>
  );
};
