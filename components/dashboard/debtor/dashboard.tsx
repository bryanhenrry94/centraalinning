"use client";
import React, { Suspense, useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  Container,
  Paper,
  Typography,
  Box,
  IconButton,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Stack,
  Tooltip,
  Button,
} from "@mui/material";

import HandshakeIcon from "@mui/icons-material/Handshake";
import VisibilityIcon from "@mui/icons-material/Visibility";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";

import { formatCurrency, formatDate } from "@/utils/formatters";
import { AgreementResponse } from "@/lib/validations/agreement";
import { notifyError } from "@/lib/notifications";

import { getAgreementsByDebtId } from "@/actions/agreement";

import { getDebtorByUserId, getDebts } from "@/actions/debtor";
import { DebtorSummary } from "@/types/DebtorSummary";
import { AgreementDialog } from "@/components/agreements/agreement-dialog";
import { PaymentsDialog } from "@/components/payment/payments-dialog";
import { AgreementFormDialog } from "@/components/agreements/agreement-form-dialog";
import { PaymentFormDialog } from "@/components/payment/payment-form-dialog";
import { $Enums } from "@/prisma/generated/prisma";

const DashboardDebtor = () => {
  const { data: session } = useSession();
  const user = session?.user;

  const [debts, setDebts] = useState<DebtorSummary[]>([]);
  const [debtSelected, setDebtSelected] = useState<DebtorSummary | null>(null);
  const [agreements, setAgreements] = useState<AgreementResponse[]>([]);

  const [openModalAgreement, setOpenModalAgreement] = useState(false);
  const [openModalNotifications, setOpenModalNotifications] = useState(false);
  const [openModalPayment, setOpenModalPayment] = useState(false);
  const [openModalPaymentForm, setOpenModalPaymentForm] = useState(false);

  /** ---------------------------------------------------------------------
   * FETCH DEBTS
   * -------------------------------------------------------------------- */
  const fetchDebts = useCallback(async () => {
    try {
      const debtor = await getDebtorByUserId(user?.id as string);
      if (!debtor) {
        notifyError("No se encontró el deudor asociado al usuario");
        return;
      }

      if (!session?.user?.tenant_id) return;
      const response = await getDebts({ debtor_id: debtor.id });

      if (response.success) setDebts(response.data || []);
    } catch (error) {
      console.error("Error fetching debts:", error);
      notifyError("Error al obtener deudas");
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) fetchDebts();
  }, [user?.id, fetchDebts]);

  /** ---------------------------------------------------------------------
   * FETCH AGREEMENTS
   * -------------------------------------------------------------------- */
  const fetchAgreements = async (debtId: string) => {
    const response = await getAgreementsByDebtId(debtId);
    setAgreements(response || []);
  };

  /** ---------------------------------------------------------------------
   * MODAL HANDLERS
   * -------------------------------------------------------------------- */
  const openAgreementModal = (debt: DebtorSummary) => {
    setDebtSelected(debt);
    setOpenModalAgreement(true);
  };

  const openPaymentModal = (debt: DebtorSummary) => {
    setDebtSelected(debt);
    setOpenModalPayment(true);
  };

  const openNotificationsModal = async (debt: DebtorSummary) => {
    setDebtSelected(debt);
    await fetchAgreements(debt.id);
    setOpenModalNotifications(true);
  };

  const onSaveAgreement = async () => {
    setOpenModalAgreement(false);
    await fetchDebts();
  };

  const handleOpenPaymentForm = () => {
    setOpenModalPaymentForm(true);
  };

  const handleClosePaymentForm = () => {
    setOpenModalPaymentForm(false);
  };

  const handleSavePayment = async () => {
    setOpenModalPaymentForm(false);
    await fetchDebts();
  };

  /** ---------------------------------------------------------------------
   * RENDER
   * -------------------------------------------------------------------- */
  return (
    <Container maxWidth="xl">
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          mb: 2,
          mt: 2,
          alignItems: "center",
        }}
      >
        <Typography variant="h4" gutterBottom sx={{ mt: 1 }}>
          Mijn schulden
        </Typography>
        <Button
          variant="contained"
          size="small"
          onClick={handleOpenPaymentForm}
        >
          Betalen
        </Button>
      </Box>

      <Suspense fallback={<h1>Loading collection cases...</h1>}>
        <TableContainer component={Paper} sx={{ mt: 2 }}>
          <Table
            stickyHeader
            size="small"
            sx={{
              "& .MuiTableCell-root": {
                border: "1px solid #e0e0e0",
                padding: "4px 8px",
              },
              "& .MuiTableRow-root": { height: "32px" },
            }}
          >
            <TableHead>
              <TableRow>
                {[
                  "Zaaktype",
                  "Referentie",
                  "Status",
                  "Datum",
                  "Reactietermijn",
                  "Totaal",
                  "Boet",
                  "Betaling",
                  "Termijn",
                  "Aflosbedrag",
                  "Startdatum",
                  "Einddatum",
                  "Open",
                  "Actie",
                ].map((col) => (
                  <TableCell
                    key={col}
                    align="center"
                    sx={{
                      minWidth: 50,
                      backgroundColor: "secondary.main",
                      color: "#fff",
                      fontWeight: "bold",
                    }}
                  >
                    {col}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>

            <TableBody>
              {debts.map((debt) => (
                <TableRow key={debt.id}>
                  <TableCell>{debt.type}</TableCell>
                  <TableCell>{debt.reference}</TableCell>
                  <TableCell align="center">{debt.status}</TableCell>
                  <TableCell align="center">
                    {debt.issue_date
                      ? formatDate(debt.issue_date.toString())
                      : "-"}
                  </TableCell>
                  <TableCell align="center">
                    {debt.due_date ? formatDate(debt.due_date.toString()) : "-"}
                  </TableCell>
                  <TableCell align="right">
                    {debt.amount ? formatCurrency(debt.amount) : "-"}
                  </TableCell>
                  <TableCell align="right">
                    {formatCurrency(debt.total_fined || 0)}
                  </TableCell>
                  <TableCell align="right">
                    {formatCurrency(debt.total_paid || 0)}
                  </TableCell>
                  <TableCell align="center">
                    {debt.agreement_installments_count || "-"}
                  </TableCell>
                  <TableCell align="center">
                    {debt.agreement_installment_amount
                      ? formatCurrency(debt.agreement_installment_amount)
                      : "-"}
                  </TableCell>
                  <TableCell align="center">
                    {debt.agreement_start_date
                      ? formatDate(debt.agreement_start_date.toString())
                      : "-"}
                  </TableCell>
                  <TableCell align="center">
                    {debt.agreement_end_date
                      ? formatDate(debt.agreement_end_date.toString())
                      : "-"}
                  </TableCell>
                  <TableCell align="right">
                    {formatCurrency(debt.balance)}
                  </TableCell>
                  <TableCell align="center">
                    <Stack direction="row" spacing={1} justifyContent="center">
                      <Tooltip title="Betalingsregeling">
                        <IconButton
                          size="small"
                          onClick={() => openAgreementModal(debt)}
                        >
                          <HandshakeIcon color="primary" fontSize="small" />
                        </IconButton>
                      </Tooltip>

                      <Tooltip title="Betalingen">
                        <IconButton
                          size="small"
                          onClick={() => openPaymentModal(debt)}
                        >
                          <AttachMoneyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>

                      <Tooltip title="Overzicht">
                        <IconButton
                          size="small"
                          onClick={() => openNotificationsModal(debt)}
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Suspense>

      {/* TOTAL DEBTS */}
      <Box sx={{ mt: 6, display: "flex", justifyContent: "flex-end" }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography variant="h6" sx={{ fontWeight: 500 }}>
            Totale schulden:
          </Typography>

          <Box sx={{ bgcolor: "grey.100", px: 2, py: 1, borderRadius: 1 }}>
            <Typography variant="h4" color="primary.main">
              {formatCurrency(
                debts.reduce((t, d) => t + (d.amount || 0), 0) +
                  debts.reduce((t, d) => t + (d.total_fined || 0), 0) -
                  debts.reduce((t, d) => t + (d.total_paid || 0), 0)
              )}
            </Typography>
          </Box>
        </Stack>
      </Box>

      <AgreementFormDialog
        open={openModalAgreement}
        onClose={() => setOpenModalAgreement(false)}
        title="NIEUWE OVEREENKOMST"
        onSave={onSaveAgreement}
        debt_id={debtSelected?.id || ""}
        initialData={{
          debt_id: debtSelected?.id || "",
          total_amount: debtSelected?.amount || 0,
          installments_count: 1,
          installment_amount: 0,
          start_date: new Date(
            new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
          ),
          end_date: new Date(),
          status: $Enums.AgreementStatus.PENDING,
          debtor_id: debtSelected?.debtor_id,
        }}
      />

      <AgreementDialog
        open={openModalNotifications}
        onClose={() => setOpenModalNotifications(false)}
        agreements={agreements}
      />

      <PaymentsDialog
        open={openModalPayment}
        onClose={() => setOpenModalPayment(false)}
        debtId={debtSelected?.id || ""}
      />

      <PaymentFormDialog
        open={openModalPaymentForm}
        onClose={handleClosePaymentForm}
        onSave={handleSavePayment}
      />
    </Container>
  );
};

export default DashboardDebtor;
