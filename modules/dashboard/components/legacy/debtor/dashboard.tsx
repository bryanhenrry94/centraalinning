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
  Divider,
} from "@mui/material";

import HandshakeIcon from "@mui/icons-material/Handshake";
import PaymentsIcon from "@mui/icons-material/Payments";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import FolderOffOutlinedIcon from "@mui/icons-material/FolderOffOutlined";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";

import { formatCurrency, formatDate } from "@/shared/utils/formatters";
import { AgreementResponse } from "@/modules/agreement/services/agreement.validators";
import { notifyError } from "@/shared/ui/notifications";

import { getAgreementsByDebtClaimId } from "@/modules/agreement/actions/agreement.actions";

import {
  getDebtorByUserId,
  getDebtorPersonalNumber,
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
import { getBlockadesByDebtorAction } from "@/modules/blockade/actions/get-blockades-by-debtor";

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

  const [blockadeActiveCount, setBlockadeActiveCount] = useState(0);
  const [blockadeInactiveCount, setBlockadeInactiveCount] = useState(0);

  const [personalNumber, setPersonalNumber] = useState<string | null>(null);

  const [tenants, setTenants] = useState<TenantTypes[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [tenantFilter, setTenantFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [filtersKey, setFiltersKey] = useState(0);

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

      const blockades = await getBlockadesByDebtorAction(
        debtor.id,
        session.user.tenant_id,
      );
      const activeBlockades = blockades.filter((b) => b.status === "ACTIVE").length;
      setBlockadeActiveCount(activeBlockades);
      setBlockadeInactiveCount(blockades.length - activeBlockades);

      const number = await getDebtorPersonalNumber(
        user?.id as string,
        session.user.tenant_id,
      );
      setPersonalNumber(number);

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

  const handleBetaalregelingClick = (debt: DebtorSummary) => {
    if (debt.agreement_installment_amount) {
      openNotificationsModal(debt);
    } else {
      openAgreementModal(debt);
    }
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

  const handleResetFilters = () => {
    setSearchQuery("");
    setTenantFilter("");
    setStatusFilter("");
    setFiltersKey((k) => k + 1);
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
  const activeCount = filteredDebts.filter(
    (d) => d.status === "OPEN" || d.status === "IN_PROGRESS",
  ).length;
  const paidCount = filteredDebts.filter((d) => (d.total_paid || 0) > 0).length;

  return (
    <Container maxWidth="xl">
      <DashboardHeader
        key={filtersKey}
        total={parseFloat(
          (
            filteredDebts.reduce((t, d) => t + (d.amount || 0), 0) +
            filteredDebts.reduce((t, d) => t + (d.total_fined || 0), 0) -
            filteredDebts.reduce((t, d) => t + (d.total_paid || 0), 0)
          ).toFixed(2),
        )}
        count={filteredDebts.length}
        activeCount={activeCount}
        totalPaid={parseFloat(
          filteredDebts.reduce((t, d) => t + (d.total_paid || 0), 0).toFixed(2),
        )}
        paidCount={paidCount}
        blockadeActiveCount={blockadeActiveCount}
        blockadeInactiveCount={blockadeInactiveCount}
        tenants={tenants}
        onSearch={handleSearch}
        onTenantChange={handleTenantChange}
        onStatusChange={handleStatusChange}
        onReset={handleResetFilters}
      />

      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          mb: 2,
          mt: 3,
          alignItems: "center",
        }}
      >
        <Typography variant="h5" fontWeight={700} color="primary.dark">
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
                  "Deelnemer",
                  "Referentie",
                  "Status",
                  "Registratiedatum",
                  "Reactietermijn",
                  "Openstaand",
                  "Betaalregeling",
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
              {filteredDebts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ border: 0, py: 6 }}>
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 1,
                      }}
                    >
                      <FolderOffOutlinedIcon
                        sx={{ fontSize: 48, color: "grey.400" }}
                      />
                      <Typography variant="subtitle1" fontWeight={700}>
                        Geen resultaten gevonden
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Er zijn geen dossiers die overeenkomen met uw
                        zoekcriteria.
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              )}
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
                    {formatCurrency(debt.balance + (debt.total_fined || 0))}
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip
                      title={
                        debt.agreement_installment_amount
                          ? "Betalingsregeling bekijken"
                          : "Betalingsregeling aanvragen"
                      }
                    >
                      <Chip
                        icon={<HandshakeIcon fontSize="small" />}
                        label={
                          debt.agreement_installment_amount
                            ? "Actief"
                            : "Geen"
                        }
                        color={
                          debt.agreement_installment_amount
                            ? "info"
                            : "default"
                        }
                        size="small"
                        clickable
                        onClick={() => handleBetaalregelingClick(debt)}
                      />
                    </Tooltip>
                  </TableCell>
                  <TableCell align="center">
                    <Stack direction="row" spacing={1} justifyContent="center">
                      <Tooltip title="Betalingen">
                        <IconButton
                          size="small"
                          onClick={() => openPaymentModal(debt)}
                        >
                          <PaymentsIcon fontSize="small" />
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
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Suspense>

      {personalNumber && (
        <Paper
          elevation={0}
          sx={{
            mt: 3,
            p: 3,
            borderRadius: 3,
            bgcolor: "#eef1fc",
          }}
        >
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            alignItems={{ xs: "flex-start", sm: "center" }}
          >
            <Stack direction="row" spacing={2} alignItems="center">
              <Box
                sx={{
                  backgroundColor: "primary.dark",
                  borderRadius: "50%",
                  width: 48,
                  height: 48,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <BadgeOutlinedIcon sx={{ color: "#fff" }} fontSize="small" />
              </Box>
              <Box>
                <Typography variant="body2" fontWeight={600}>
                  Uw persoonlijk CFSB-nummer
                </Typography>
                <Typography variant="h6" fontWeight={700}>
                  {personalNumber}
                </Typography>
              </Box>
            </Stack>

            <Divider
              orientation="vertical"
              flexItem
              sx={{ display: { xs: "none", sm: "block" } }}
            />

            <Typography variant="body2" color="text.secondary">
              Dit is uw unieke en permanente CFSB-identiteit. Bewaar dit
              nummer goed.
            </Typography>
          </Stack>
        </Paper>
      )}

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
