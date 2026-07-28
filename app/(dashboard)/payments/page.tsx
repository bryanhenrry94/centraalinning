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
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import HistoryIcon from "@mui/icons-material/History";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";

import { formatCurrency } from "@/shared/utils/formatters";
import { notifyError } from "@/shared/ui/notifications";
import {
  getDebtorByUserId,
  getDebts,
} from "@/modules/collection/actions/debtor.actions";
import { DebtorSummary } from "@/modules/collection/types/DebtorSummary";
import { TransferPaymentDialog } from "@/modules/payment/components/transfer-payment-dialog";
import { getSourceStatusInfo } from "@/modules/collection/utils/debt-claim-status";
import { PaymentsDialog } from "@/modules/payment/components/payments-dialog";

const PaymentsPage = () => {
  const { data: session } = useSession();
  const user = session?.user;

  const [debts, setDebts] = useState<DebtorSummary[]>([]);
  const [historyDebtId, setHistoryDebtId] = useState<string | null>(null);
  const [transferDebt, setTransferDebt] = useState<DebtorSummary | null>(null);

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

  const handlePay = (debt: DebtorSummary) => {
    setTransferDebt(debt);
  };

  const outstandingDebts = debts.filter((d) => d.balance > 0);

  return (
    <Container maxWidth="xl">
      <Box sx={{ mt: { xs: 1.5, sm: 4 }, mb: 2 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
          Betalen
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Overzicht van openstaande bedragen en betalingen.
        </Typography>
      </Box>

      <TableContainer component={Paper} sx={{ mt: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {["Deelnemer", "Referentie", "Status", "Openstaand", "Actie"].map(
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
            {outstandingDebts.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ fontStyle: "italic" }}>
                  Geen openstaande bedragen.
                </TableCell>
              </TableRow>
            )}
            {outstandingDebts.map((debt) => (
              <TableRow key={debt.id}>
                <TableCell>{debt.tenant_name}</TableCell>
                <TableCell align="center">{debt.reference}</TableCell>
                <TableCell align="center">
                  <Chip
                    label={getSourceStatusInfo(debt.source_status).label}
                    color={getSourceStatusInfo(debt.source_status).color}
                    size="small"
                  />
                </TableCell>
                <TableCell align="right">{formatCurrency(debt.balance)}</TableCell>
                <TableCell align="center">
                  <Tooltip title="Betalingsoverzicht">
                    <IconButton
                      size="small"
                      onClick={() => setHistoryDebtId(debt.id)}
                    >
                      <HistoryIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Button
                    size="small"
                    variant="contained"
                    color="error"
                    startIcon={<AttachMoneyIcon fontSize="small" />}
                    onClick={() => handlePay(debt)}
                    sx={{ ml: 1 }}
                  >
                    Betalen
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <PaymentsDialog
        open={!!historyDebtId}
        onClose={() => setHistoryDebtId(null)}
        debtId={historyDebtId || ""}
      />

      <TransferPaymentDialog
        open={!!transferDebt}
        onClose={() => setTransferDebt(null)}
        debt={transferDebt}
        debtorEmail={user?.email || ""}
        onSuccess={fetchDebts}
      />
    </Container>
  );
};

export default PaymentsPage;
