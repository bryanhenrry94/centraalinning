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

import { formatCurrency, formatDate } from "@/shared/utils/formatters";
import { AgreementResponse } from "@/modules/agreement/services/agreement.validators";
import { notifyError } from "@/shared/ui/notifications";

import { getAgreementsByDebtClaimId } from "@/modules/agreement/actions/agreement.actions";

import {
  getDebtorByUserId,
  getDebts,
} from "@/modules/collection/actions/debtor.actions";
import { DebtorSummary } from "@/modules/collection/types/DebtorSummary";
import { AgreementDialog } from "@/modules/agreement/components/agreement-dialog";
import { PaymentsDialog } from "@/modules/payment/components/payments-dialog";
import { AgreementFormDialog } from "@/modules/agreement/components/agreement-form-dialog";
import { PaymentFormDialog } from "@/modules/payment/components/payment-form-dialog";
import { payDebt } from "@/modules/payment/utils/pay-debt";
import DashboardHeader from "./DashboardHeader";
import { AgreementStatus } from "@/modules/agreement/constants/agreement-status";
import { getSourceStatusInfo } from "@/modules/collection/utils/debt-claim-status";

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
      const debtor = await getDebtorByUserId(
        user?.id as string,
        session?.user?.tenant_id as string,
      );
      if (!debtor) {
        notifyError("No se encontró el deudor asociado al usuario");
        return;
      }

      if (!session?.user?.tenant_id) return;
      const response = await getDebts({ debtor_id: debtor.id });

      console.log("response: ", response);

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
  }, [user?.id, session?.user?.tenant_id]);

  useEffect(() => {
    if (user?.id) fetchDebts();
  }, [user?.id, fetchDebts]);

  /** ---------------------------------------------------------------------
   * FETCH AGREEMENTS
   * -------------------------------------------------------------------- */
  const fetchAgreements = async (debtId: string) => {
    const response = await getAgreementsByDebtClaimId(debtId);
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
    setLoadingPayment(true);
    try {
      await payDebt(debt);
    } catch (error) {
      console.error(error);
      notifyError("Error al procesar el pago");
    } finally {
      setLoadingPayment(false);
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
          Mijn verplichtingen
        </Typography>
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
                      const status = getSourceStatusInfo(debt.source_status);
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
        debtClaim_id={debtSelected?.id || ""}
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
