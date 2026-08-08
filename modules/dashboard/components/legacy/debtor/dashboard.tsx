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
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Divider,
} from "@mui/material";

import HandshakeIcon from "@mui/icons-material/Handshake";
import PaymentsIcon from "@mui/icons-material/Payments";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import FolderOffOutlinedIcon from "@mui/icons-material/FolderOffOutlined";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import MoreVertIcon from "@mui/icons-material/MoreVert";

import { formatCurrency, formatDate } from "@/shared/utils/formatters";
import { AgreementResponse } from "@/modules/agreement/services/agreement.validators";
import { notifyError } from "@/shared/ui/notifications";

import { getAgreementsByDebtClaimId } from "@/modules/agreement/actions/agreement.actions";
import {
  isAgreementApproved,
  hasOpenAgreement,
} from "@/modules/agreement/constants/agreement-status";

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
import { TransferPaymentDialog } from "@/modules/payment/components/transfer-payment-dialog";
import DashboardHeader from "./DashboardHeader";
import { AgreementStatus } from "@/modules/agreement/constants/agreement-status";
import {
  getSourceStatusInfo,
  ChipColor,
} from "@/modules/collection/utils/debt-claim-status";
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

  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [menuDebt, setMenuDebt] = useState<DebtorSummary | null>(null);

  const [openModalAgreement, setOpenModalAgreement] = useState(false);
  const [openModalNotifications, setOpenModalNotifications] = useState(false);
  const [openModalPayment, setOpenModalPayment] = useState(false);
  const [openModalPaymentForm, setOpenModalPaymentForm] = useState(false);
  const [openModalTransferPayment, setOpenModalTransferPayment] =
    useState(false);

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
  }, [debts, searchQuery, tenantFilter, statusFilter]);

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
        notifyError("Geen debiteur gevonden voor deze gebruiker");
        return;
      }

      if (!session?.user?.tenant_id) return;
      const response = await getDebts({ debtor_id: debtor.id });

      const blockades = await getBlockadesByDebtorAction(
        debtor.id,
        session.user.tenant_id,
      );
      const activeBlockades = blockades.filter(
        (b) => b.status === "ACTIVE",
      ).length;
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
      notifyError("Fout bij het ophalen van schulden");
    }
  }, [user?.id, session?.user?.tenant_id]);

  useEffect(() => {
    if (!user?.id) return;
    if (!session?.user?.tenant_id) return;

    fetchDebts();
  }, [user?.id, session?.user?.tenant_id, fetchDebts]);

  /** ---------------------------------------------------------------------
   * FETCH AGREEMENTS
   * -------------------------------------------------------------------- */
  const fetchAgreements = async (debtId: string) => {
    const response = await getAgreementsByDebtClaimId(debtId);
    // El overzicht sólo debe mostrar acuerdos activos (aprobado o en
    // behandeling); solicitudes afgewezen/geannuleerd de rondas anteriores
    // no deben acumularse en este resumen.
    setAgreements((response || []).filter((a) => hasOpenAgreement(a.status)));
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
    if (hasOpenAgreement(debt.agreement_status)) {
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

  const handlePaymentDebtor = (debt: DebtorSummary) => {
    setDebtSelected(debt);
    setOpenModalTransferPayment(true);
  };

  const handleMenuOpen = (
    event: React.MouseEvent<HTMLElement>,
    debt: DebtorSummary,
  ) => {
    setMenuAnchorEl(event.currentTarget);
    setMenuDebt(debt);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setMenuDebt(null);
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

  // Sólo se gatea cuando hay un deadline registrado; los pasos AOP
  // posteriores al primero (Aanmaning) aún no persisten uno, y en ese caso
  // no se penaliza al deudor por un dato faltante.
  const isReactionTermExpired = (dueDate?: string | Date | null) => {
    if (!dueDate) return false;
    return new Date(dueDate).getTime() < Date.now();
  };

  // Misma forma que getSourceStatusInfo (label + color semántico MUI), para
  // que todos los chips de la tabla compartan un único lenguaje visual.
  const getReactietermijnInfo = (
    dateStr: string,
  ): { label: string; color: ChipColor } => {
    const date = new Date(dateStr);
    const diffDays = Math.ceil(
      (date.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );

    if (diffDays > 0) return { label: `${diffDays} dagen`, color: "success" };
    if (diffDays === 0) return { label: "Vandaag", color: "warning" };
    return { label: `${Math.abs(diffDays)} dagen geleden`, color: "error" };
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

      <Suspense fallback={<h1>Loading collection cases...</h1>}>
        <TableContainer
          component={Paper}
          variant="outlined"
          sx={{ borderColor: "grey.200" }}
        >
          <Table
            stickyHeader
            size="small"
            sx={{
              "& .MuiTableCell-root": {
                borderBottom: "1px solid",
                borderColor: "grey.200",
                padding: "8px 12px",
              },
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
                      fontWeight: 600,
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
                  <TableCell
                    colSpan={8}
                    align="center"
                    sx={{ borderBottom: 0, py: 6 }}
                  >
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
                <TableRow key={debt.id} hover>
                  <TableCell>{debt.tenant_name}</TableCell>
                  <TableCell>{debt.reference}</TableCell>
                  <TableCell align="center">
                    {(() => {
                      const status = getSourceStatusInfo(debt.source_status);
                      return (
                        <Chip
                          label={status.label}
                          color={status.color}
                          size="small"
                          variant="outlined"
                          sx={{ width: 150 }}
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
                      ? (() => {
                          const reaction = getReactietermijnInfo(
                            debt.due_date.toString(),
                          );
                          return (
                            <Chip
                              label={reaction.label}
                              color={reaction.color}
                              size="small"
                              variant="outlined"
                              sx={{ width: 150 }}
                            />
                          );
                        })()
                      : "-"}
                  </TableCell>
                  <TableCell align="right">
                    {formatCurrency(debt.balance + (debt.total_fined || 0))}
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      icon={<HandshakeIcon fontSize="small" />}
                      label={
                        isAgreementApproved(debt.agreement_status)
                          ? "Actief"
                          : hasOpenAgreement(debt.agreement_status)
                            ? "In behandeling"
                            : "Geen"
                      }
                      color={
                        isAgreementApproved(debt.agreement_status)
                          ? "info"
                          : hasOpenAgreement(debt.agreement_status)
                            ? "warning"
                            : "default"
                      }
                      size="small"
                      variant="outlined"
                      sx={{ width: 150 }}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      aria-label="Acties"
                      aria-haspopup="true"
                      onClick={(e) => handleMenuOpen(e, debt)}
                    >
                      <MoreVertIcon fontSize="small" />
                    </IconButton>
                    <Menu
                      anchorEl={menuAnchorEl}
                      open={Boolean(menuAnchorEl) && menuDebt?.id === debt.id}
                      onClose={handleMenuClose}
                    >
                      <MenuItem
                        onClick={() => {
                          openPaymentModal(debt);
                          handleMenuClose();
                        }}
                      >
                        <ListItemIcon>
                          <PaymentsIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>Betalingen</ListItemText>
                      </MenuItem>

                      <MenuItem
                        disabled={debt.balance <= 0}
                        onClick={() => {
                          handlePaymentDebtor(debt);
                          handleMenuClose();
                        }}
                      >
                        <ListItemIcon>
                          <AttachMoneyIcon fontSize="small" color="error" />
                        </ListItemIcon>
                        <ListItemText>Betalen</ListItemText>
                      </MenuItem>

                      <MenuItem
                        disabled={
                          !hasOpenAgreement(debt.agreement_status) &&
                          isReactionTermExpired(debt.due_date)
                        }
                        onClick={() => {
                          handleBetaalregelingClick(debt);
                          handleMenuClose();
                        }}
                      >
                        <ListItemIcon>
                          <HandshakeIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>
                          {hasOpenAgreement(debt.agreement_status)
                            ? "Regeling"
                            : "Regeling aanvragen"}
                        </ListItemText>
                      </MenuItem>
                    </Menu>
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
        title="Betalingsregeling aanvragen"
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

      <TransferPaymentDialog
        open={openModalTransferPayment}
        onClose={() => setOpenModalTransferPayment(false)}
        debt={debtSelected}
        debtorEmail={user?.email || ""}
        onSuccess={fetchDebts}
      />
    </Container>
  );
};

export default DashboardDebtor;
