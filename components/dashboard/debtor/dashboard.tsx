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
  Chip,
} from "@mui/material";

import HandshakeIcon from "@mui/icons-material/Handshake";
import PaymentsIcon from "@mui/icons-material/Payments";
import VisibilityIcon from "@mui/icons-material/Visibility";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";

import { formatCurrency, formatDate } from "@/utils/formatters";
import { AgreementResponse } from "@/lib/validations/agreement";
import { notifyError, notifyInfo, notifyWarning } from "@/lib/notifications";

import {
  getAgreementByDebtId,
  getAgreementsByDebtId,
} from "@/actions/agreement";

import { getDebtorByUserId, getDebts } from "@/actions/debtor";
import { DebtorSummary } from "@/types/DebtorSummary";
import { AgreementDialog } from "@/components/agreements/agreement-dialog";
import { PaymentsDialog } from "@/components/payment/payments-dialog";
import { AgreementFormDialog } from "@/components/agreements/agreement-form-dialog";
import { PaymentFormDialog } from "@/components/payment/payment-form-dialog";
import { createSentooPayment } from "@/actions/sentoo.actions";
import { AlertService } from "@/lib/alerts";
import { PaymentCreate } from "@/lib/validations/payment";
import {
  getPaymentByDebtId,
  hasPendingPayments,
  registerPayment,
} from "@/actions/payment";
import DashboardHeader from "./DashboardHeader";
import { AgreementStatus } from "@/constants/agreement-status";

type TenantTypes = {
  id: string;
  name: string;
};

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

  const [loadingPayment, setLoadingPayment] = useState(false);

  const [tenants, setTenants] = useState<TenantTypes[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [tenantFilter, setTenantFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [filteredDebts, setFilteredDebts] = useState<DebtorSummary[]>([]);

  useEffect(() => {
    // filtra debts según searchQuery, tenantFilter y statusFilter
    let filtered = [...debts];

    if (searchQuery) {
      filtered = filtered.filter(
        (d) =>
          d.reference &&
          d.reference.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }

    if (tenantFilter) {
      filtered = filtered.filter((d) => d.tenant_id === tenantFilter);
    }

    if (statusFilter) {
      filtered = filtered.filter((d) => d.source_status === statusFilter);
    }

    setFilteredDebts(filtered);
  }, [searchQuery, tenantFilter, statusFilter]);

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
      const response = await getDebts({ person_id: debtor.person_id });

      if (response.success) {
        setDebts(response.data || []);

        // Extraer tenants únicos
        const uniqueTenants: TenantTypes[] = [];
        response.data?.forEach((debt) => {
          if (
            debt.tenant_id &&
            !uniqueTenants.some((t) => t.id === debt.tenant_id)
          ) {
            uniqueTenants.push({
              id: debt.tenant_id,
              name: debt.tenant_name || "Desconocido",
            });
          }
        });
        setTenants(uniqueTenants);
      }
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

  const handlePaymentDebtor = async (debt: DebtorSummary) => {
    if (!debt) {
      notifyError("No se seleccionó una deuda para pagar");
      return;
    }

    setLoadingPayment(true);

    try {
      const collectionCaseId = debt.source_id;

      if (!collectionCaseId) {
        notifyError("No se encontró el caso de cobranza asociado a esta deuda");
        return;
      }

      // 1. Validar pagos pendientes
      const existingPayment = await getPendingPayment(debt.id);
      if (existingPayment) {
        handleExistingPayment(existingPayment);
        return;
      }

      // 2. Validar acuerdos
      const agreement = await getAgreementByDebtId(debt.id);

      if (agreement?.status === AgreementStatus.PENDING) {
        notifyWarning(
          "Tu solicitud de acuerdo de pago está pendiente de aprobación.",
        );
        return;
      }

      const amountToPay = agreement?.installment_amount ?? debt.balance;

      // 3. Confirmación usuario (await real)
      const confirmed = await AlertService.showConfirm(
        "¿Estás seguro?",
        `Vas a pagar ${formatCurrency(amountToPay)} para la deuda ${debt.reference}.`,
        "Sí, pagar",
        "Cancelar",
      );

      if (!confirmed) return;

      // 4. Crear pago
      await processPayment({
        debt,
        amountToPay,
        collectionCaseId,
      });
    } catch (error) {
      console.error(error);
      notifyError("Error al procesar el pago");
    } finally {
      setLoadingPayment(false);
    }
  };

  const getPendingPayment = async (debtId: string) => {
    const hasPending = await hasPendingPayments(debtId);
    if (!hasPending) return null;

    return await getPaymentByDebtId(debtId);
  };

  const handleExistingPayment = (payment: any) => {
    notifyWarning("Tienes un pago pendiente. Redirigiendo al proveedor...");

    if (payment?.provider === "sentoo") {
      try {
        const payload = JSON.parse(payment.provider_payload || "{}");
        const url = payload?.success?.data?.url;

        if (url) window.location.href = url;
      } catch {
        notifyError("No se pudo recuperar el link de pago");
      }
    }
  };

  const processPayment = async ({
    debt,
    amountToPay,
    collectionCaseId,
  }: {
    debt: DebtorSummary;
    amountToPay: number;
    collectionCaseId: string;
  }) => {
    const newTab = window.open("", "_blank");

    try {
      const res = await createSentooPayment({
        amount: amountToPay,
        description: `Pago deuda ${debt.reference}`,
        reference: `debt-${debt.id}-case-${collectionCaseId}-${Date.now()}`,
      });

      if (!res.success || !res.payment?.url) {
        throw new Error("Error al crear el pago en Sentoo");
      }

      const payment: PaymentCreate = {
        debt_id: debt.id,
        method: "TRANSFER",
        total_amount: amountToPay,
        paid_at: null,
        status: "pending",
        provider: "sentoo",
        provider_ref: res.payment.id,
        provider_payload: JSON.stringify(res.raw),
        reference_number: "",
        agreement_id: null,
      };

      const paymentRes = await registerPayment(payment);

      if (!paymentRes.id) {
        notifyError("Error al registrar el pago");
        newTab?.close();
        return;
      }

      notifyInfo("Redirigiendo a la pasarela de pago...");

      if (newTab) {
        newTab.location.href = res.payment.url;
      } else {
        window.location.href = res.payment.url;
      }
    } catch (error) {
      console.error(error);
      notifyError("Error al crear el pago");
      newTab?.close();
    }
  };

  const formatStatus = (status: string) => {
    // AANMANING, SOMMATIE, ETC
    switch (status) {
      case "AANMANING":
        return { label: "Aanmaning", color: "info" as const };
      case "SOMMATIE":
        return { label: "Sommatie", color: "warning" as const };
      case "INGEBREKESTELLING":
        return { label: "Ingebrekestelling", color: "warning" as const };
      case "BLOKKADE":
        return { label: "Blokkade", color: "error" as const };
      default:
        return { label: status, color: "default" as const };
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    // Implementar lógica de búsqueda aquí (ej. filtrar deudas por referencia o descripción)
  };

  const handleTenantChange = (tenantId: string) => {
    setTenantFilter(tenantId);
    // Implementar lógica de filtrado por tenant aquí
  };

  const handleStatusChange = (status: string) => {
    setStatusFilter(status);
    // Implementar lógica de filtrado por estado aquí
  };

  const ReactietermijnLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();

    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 0) {
      return `${diffDays} dagen`;
    }

    if (diffDays === 0) {
      return (
        <Chip
          label="Vandaag"
          size="small"
          color="error"
          sx={{ fontWeight: 600 }}
        />
      );
    }

    return (
      <Chip
        label={`${Math.abs(diffDays)} dagen geleden`}
        size="small"
        color="error"
        variant="filled"
      />
    );
  };

  /** ---------------------------------------------------------------------
   * RENDER
   * -------------------------------------------------------------------- */
  return (
    <Container maxWidth="xl">
      <DashboardHeader
        total={parseFloat(
          (
            filteredDebts.reduce((t, d) => t + (d.amount || 0), 0) +
            filteredDebts.reduce((t, d) => t + (d.total_fined || 0), 0) -
            filteredDebts.reduce((t, d) => t + (d.total_paid || 0), 0)
          ).toFixed(2),
        )}
        count={filteredDebts.length}
        tenants={tenants}
        onSearch={handleSearch}
        onTenantChange={handleTenantChange}
        onStatusChange={handleStatusChange}
      />

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
        {/* <Button
          variant="contained"
          size="small"
          onClick={handleOpenPaymentForm}
        >
          Betalen
        </Button> */}
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
                  "Schuldeiser",
                  "Referentie",
                  "Status",
                  "Datum",
                  "Reactietermijn",
                  "Totaal",
                  "Boet",
                  "Betaling",
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
              {filteredDebts.map((debt) => (
                <TableRow key={debt.id}>
                  <TableCell>{debt.tenant_name}</TableCell>
                  <TableCell>{debt.reference}</TableCell>
                  <TableCell align="center">
                    {(() => {
                      const status = formatStatus(debt.source_status);
                      return (
                        <Chip
                          label={status.label}
                          color={status.color}
                          sx={{ color: "#000" }}
                        />
                      );
                    })()}
                  </TableCell>
                  <TableCell align="center">
                    {debt.issue_date
                      ? formatDate(debt.issue_date.toString())
                      : "-"}
                  </TableCell>
                  <TableCell align="center">
                    {debt.due_date
                      ? ReactietermijnLabel(debt.due_date.toString())
                      : "-"}
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
                          <HandshakeIcon color="info" fontSize="small" />
                        </IconButton>
                      </Tooltip>

                      <Tooltip title="Betalingen">
                        <IconButton
                          size="small"
                          onClick={() => openPaymentModal(debt)}
                        >
                          <PaymentsIcon fontSize="small" />
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

                      <Tooltip title="Betalen">
                        <Button
                          size="small"
                          onClick={() => handlePaymentDebtor(debt)}
                          variant="contained"
                          color="error"
                          startIcon={<AttachMoneyIcon fontSize="small" />}
                          disabled={debt.balance <= 0 || loadingPayment}
                          loading={loadingPayment}
                        >
                          Betalen
                        </Button>
                      </Tooltip>
                    </Stack>

                    {/* {JSON.stringify(debt)} */}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Suspense>

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
            new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0),
          ),
          end_date: new Date(),
          status: AgreementStatus.PENDING,
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
