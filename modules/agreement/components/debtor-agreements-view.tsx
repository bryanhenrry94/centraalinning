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

import { formatCurrency } from "@/shared/utils/formatters";
import { notifyError } from "@/shared/ui/notifications";
import {
  getDebtorByUserId,
  getDebts,
} from "@/modules/collection/actions/debtor.actions";
import { DebtorSummary } from "@/modules/collection/types/DebtorSummary";
import { AgreementFormDialog } from "@/modules/agreement/components/agreement-form-dialog";
import {
  AgreementStatus,
  isAgreementApproved,
  isAgreementPending,
} from "@/modules/agreement/constants/agreement-status";

export const DebtorAgreementsView = () => {
  const { data: session } = useSession();
  const user = session?.user;

  const [debts, setDebts] = useState<DebtorSummary[]>([]);
  const [debtSelected, setDebtSelected] = useState<DebtorSummary | null>(null);
  const [openModalAgreement, setOpenModalAgreement] = useState(false);

  const fetchDebts = useCallback(async () => {
    if (!user?.id || !user?.tenant_id) return;

    try {
      const debtor = await getDebtorByUserId(user.id, user.tenant_id);
      if (!debtor) {
        notifyError("No se encontró el deudor asociado al usuario");
        return;
      }

      const response = await getDebts({ debtor_id: debtor.id });
      if (response.success) {
        setDebts(response.data || []);
      }
    } catch (error) {
      console.error("Error fetching debts:", error);
      notifyError("Error al obtener deudas");
    }
  }, [user?.id, user?.tenant_id]);

  useEffect(() => {
    fetchDebts();
  }, [fetchDebts]);

  const openAgreementModal = (debt: DebtorSummary) => {
    setDebtSelected(debt);
    setOpenModalAgreement(true);
  };

  const onSaveAgreement = async () => {
    setOpenModalAgreement(false);
    await fetchDebts();
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ mt: { xs: 1.5, sm: 4 }, mb: 2 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
          Betalingsregeling
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Bekijk uw betalingsregelingen of vraag een nieuwe aan.
        </Typography>
      </Box>

      <TableContainer component={Paper} sx={{ mt: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {["Deelnemer", "Referentie", "Openstaand", "Regeling", "Actie"].map(
                (col) => (
                  <TableCell
                    key={col}
                    align="center"
                    sx={{
                      backgroundColor: "secondary.main",
                      color: "#fff",
                      fontWeight: "bold",
                    }}
                  >
                    {col}
                  </TableCell>
                ),
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {debts.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ fontStyle: "italic" }}>
                  Geen dossiers gevonden.
                </TableCell>
              </TableRow>
            )}
            {debts.map((debt) => (
              <TableRow key={debt.id}>
                <TableCell>{debt.tenant_name}</TableCell>
                <TableCell align="center">{debt.reference}</TableCell>
                <TableCell align="right">{formatCurrency(debt.balance)}</TableCell>
                <TableCell align="center">
                  {isAgreementApproved(debt.agreement_status) ? (
                    <Chip label="Actief" color="info" size="small" />
                  ) : isAgreementPending(debt.agreement_status) ? (
                    <Chip label="In behandeling" color="warning" size="small" />
                  ) : (
                    <Chip label="Geen" size="small" />
                  )}
                </TableCell>
                <TableCell align="center">
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<HandshakeIcon fontSize="small" />}
                    disabled={debt.balance <= 0}
                    onClick={() => openAgreementModal(debt)}
                  >
                    Aanvragen
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <AgreementFormDialog
        open={openModalAgreement}
        onClose={() => setOpenModalAgreement(false)}
        title="Betalingsregeling aanvragen"
        onSave={onSaveAgreement}
        debtClaim_id={debtSelected?.id || ""}
        referenceLabel={
          debtSelected
            ? `${debtSelected.reference || debtSelected.id} – ${debtSelected.tenant_name}`
            : undefined
        }
        outstandingAmount={debtSelected?.balance}
        initialData={{
          debtClaim_id: debtSelected?.id || "",
          total_amount: debtSelected?.amount || 0,
          installments_count: 1,
          installment_amount: 0,
          start_date: new Date(
            new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0),
          ),
          end_date: new Date(),
          status: AgreementStatus.PENDING,
          debtor_id: debtSelected?.debtor_id,
          comment: "",
        }}
      />
    </Container>
  );
};
