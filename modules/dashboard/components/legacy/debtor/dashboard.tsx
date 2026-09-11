"use client";
import React, { Suspense, useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Container,
  Typography,
  Box,
  IconButton,
  Chip,
  Divider,
  Stack,
  Tooltip,
  Card,
  CardActionArea,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Button,
} from "@mui/material";
import {
  ListColumn,
  ResponsiveListTable,
} from "@/shared/ui/responsive-list-table";

import HandshakeIcon from "@mui/icons-material/Handshake";
import PaymentsIcon from "@mui/icons-material/Payments";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
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
import { PayCollectionFeeDialog } from "@/modules/payment/components/pay-collection-fee-dialog";
import DashboardHeader from "./DashboardHeader";
import { AgreementStatus } from "@/modules/agreement/constants/agreement-status";
import {
  getSourceStatusInfo,
  ChipColor,
} from "@/modules/collection/utils/debt-claim-status";
import { getBlockadesByDebtorAction } from "@/modules/blockade/actions/get-blockades-by-debtor";
import { getParameterAction } from "@/modules/settings/actions/parameter.actions";

type TenantTypes = {
  id: string;
  name: string;
};

const DashboardDebtor = () => {
  const { data: session } = useSession();
  const user = session?.user;
  const router = useRouter();

  const [debts, setDebts] = useState<DebtorSummary[]>([]);
  const [debtSelected, setDebtSelected] = useState<DebtorSummary | null>(null);
  const [agreements, setAgreements] = useState<AgreementResponse[]>([]);

  const [openModalAgreement, setOpenModalAgreement] = useState(false);
  const [openModalNotifications, setOpenModalNotifications] = useState(false);
  const [openModalPayment, setOpenModalPayment] = useState(false);
  const [openModalPaymentForm, setOpenModalPaymentForm] = useState(false);
  const [openModalCollectionFee, setOpenModalCollectionFee] = useState(false);
  const [openModalTransferPayment, setOpenModalTransferPayment] =
    useState(false);

  // Onthoudt de deelnemer-betaling die moet volgen zodra de CFSB-kosten voor
  // hetzelfde dossier bevestigd zijn (zie getActionMenuItems/handleCfsbPaid)
  // — zo verloopt "CFSB-kosten + deelnemer betalen" als één ononderbroken
  // proces in plaats van twee losse acties.
  const [pendingParticipantDebt, setPendingParticipantDebt] =
    useState<DebtorSummary | null>(null);

  const [financialReportPrice, setFinancialReportPrice] = useState<
    number | null
  >(null);

  // Eén "..."-icoon per rij dat de beschikbare acties (betalen/regeling
  // aanvragen/betalingen bekijken) in een menu bundelt, in plaats van losse
  // knoppen naast elkaar in de Actie-kolom.
  const [actionMenuAnchorEl, setActionMenuAnchorEl] =
    useState<HTMLElement | null>(null);
  const [actionMenuDebt, setActionMenuDebt] = useState<DebtorSummary | null>(
    null,
  );

  const closeActionMenu = () => {
    setActionMenuAnchorEl(null);
    setActionMenuDebt(null);
  };

  const [blockadeActiveCount, setBlockadeActiveCount] = useState(0);
  const [blockadeInactiveCount, setBlockadeInactiveCount] = useState(0);

  const [personalNumber, setPersonalNumber] = useState<string | null>(null);

  const [tenants, setTenants] = useState<TenantTypes[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [tenantFilter, setTenantFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  // Aparte van statusFilter (AOP-stap) — vereiste sponsor 2026-09-03: een
  // simpel Openstaand/Afgerond-filter op basis van saldo, dat de KPI
  // "Totaal dossiers" (altijd het volledige aantal, ongeacht filters) niet
  // mag beïnvloeden.
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("");
  const [filtersKey, setFiltersKey] = useState(0);

  const [filteredDebts, setFilteredDebts] = useState<DebtorSummary[]>([]);

  useEffect(() => {
    // filtra debts según searchQuery, tenantFilter, statusFilter y paymentStatusFilter
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

    if (paymentStatusFilter === "OPEN") {
      filtered = filtered.filter((d) => (d.balance || 0) > 0);
    } else if (paymentStatusFilter === "CLOSED") {
      filtered = filtered.filter((d) => (d.balance || 0) <= 0);
    }

    setFilteredDebts(filtered);
  }, [debts, searchQuery, tenantFilter, statusFilter, paymentStatusFilter]);

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

  // Prijs voor de "Financiële Verklaring aanvragen"-kaart bovenaan het
  // scherm — dezelfde parameter als /financial-report gebruikt, hier alleen
  // getoond ter indicatie voordat de debiteur doorklikt.
  useEffect(() => {
    getParameterAction()
      .then((parameter) =>
        setFinancialReportPrice(
          Number(parameter?.report_financial_pricing ?? 0),
        ),
      )
      .catch(() => setFinancialReportPrice(null));
  }, []);

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
      return;
    }

    // Een betalingsregeling is alleen voor de hoofdsom aan de deelnemer —
    // pas toegankelijk zodra de CFSB-kosten volledig betaald zijn (anders
    // zou de debiteur een regeling kunnen aanvragen terwijl er nog een
    // openstaande betaling aan CFSB zelf is).
    if (debt.debtor_to_cfsb_balance > 0) {
      notifyError(
        "U moet eerst de CFSB-kosten volledig betalen voordat u een betalingsregeling kunt aanvragen.",
      );
      return;
    }

    openAgreementModal(debt);
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

  // Zodra de PayCollectionFeeDialog de CFSB-betaling bevestigt, ververst dit
  // de dossiers én opent meteen de deelnemer-betaling als daar nog een saldo
  // voor openstond — de debiteur hoeft na "CFSB-kosten betalen" niet apart
  // nog eens op "Betalen" te klikken.
  const handleCfsbPaid = async () => {
    await fetchDebts();
    if (
      pendingParticipantDebt &&
      pendingParticipantDebt.debtor_to_participant_balance > 0
    ) {
      handlePaymentDebtor(pendingParticipantDebt);
    }
    setPendingParticipantDebt(null);
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

  const handlePaymentStatusChange = (status: string) => {
    setPaymentStatusFilter(status);
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setTenantFilter("");
    setStatusFilter("");
    setPaymentStatusFilter("");
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

  // Alternativa disponible junto a "Betalen": pedir una regeling en vez de
  // pagar todo de una vez. Solo tiene sentido cuando aún no hay una regeling
  // abierta y el plazo de reacción no venció — misma condición que antes
  // deshabilitaba el ítem "Regeling aanvragen" del menú.
  const canRequestAgreement = (debt: DebtorSummary) =>
    debt.debtor_to_cfsb_balance <= 0 &&
    !hasOpenAgreement(debt.agreement_status) &&
    debt.debtor_to_participant_balance > 0 &&
    !isReactionTermExpired(debt.due_date);

  // Una regeling PENDING/IN_NEGOTIATION/COUNTEROFFER todavía no tiene
  // condiciones vinculantes (a la espera de que el tenant la apruebe), así
  // que bloquea el pago directo del saldo al deelnemer. Una vez ACCEPTED
  // (Actief) esa razón ya no aplica: el deudor debe poder seguir pagando su
  // saldo aunque la regeling siga abierta.
  const participantPaymentBlockedByAgreement = (debt: DebtorSummary) =>
    hasOpenAgreement(debt.agreement_status) &&
    !isAgreementApproved(debt.agreement_status);

  type ActionMenuItem = {
    key: string;
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
  };

  // Bundelt alle acties die voor dit dossier beschikbaar zijn voor het
  // "..."-menu in de Actie-kolom. CFSB-kosten hebben voorrang en het proces
  // springt daarna automatisch door naar de deelnemer-betaling
  // (handleCfsbPaid) — los van een eventuele regeling, want die gaat alleen
  // over het deelnemer-bedrag. "Regeling bekijken/in behandeling" en
  // "Betalen" kunnen naast elkaar bestaan zodra de regeling Actief is.
  const getActionMenuItems = (debt: DebtorSummary): ActionMenuItem[] => {
    const items: ActionMenuItem[] = [];

    if (debt.debtor_to_cfsb_balance > 0) {
      items.push({
        key: "pay-cfsb",
        label: "Betalen",
        icon: <AttachMoneyIcon fontSize="small" />,
        onClick: () => {
          setDebtSelected(debt);
          setPendingParticipantDebt(debt);
          setOpenModalCollectionFee(true);
        },
      });
    }

    if (hasOpenAgreement(debt.agreement_status)) {
      items.push({
        key: "agreement-view",
        label: isAgreementApproved(debt.agreement_status)
          ? "Regeling bekijken"
          : "Regeling in behandeling",
        icon: <HandshakeIcon fontSize="small" />,
        onClick: () => openNotificationsModal(debt),
      });
    }

    if (
      debt.debtor_to_cfsb_balance <= 0 &&
      debt.debtor_to_participant_balance > 0 &&
      !participantPaymentBlockedByAgreement(debt)
    ) {
      items.push({
        key: "pay-participant",
        label: "Betalen",
        icon: <AttachMoneyIcon fontSize="small" />,
        onClick: () => handlePaymentDebtor(debt),
      });
    }

    if (canRequestAgreement(debt)) {
      items.push({
        key: "agreement-request",
        label: "Regeling aanvragen",
        icon: <HandshakeIcon fontSize="small" />,
        onClick: () => handleBetaalregelingClick(debt),
      });
    }

    items.push({
      key: "payments",
      label: "Betalingen bekijken",
      icon: <PaymentsIcon fontSize="small" />,
      onClick: () => openPaymentModal(debt),
    });

    return items;
  };

  /** ---------------------------------------------------------------------
   * RENDER
   * -------------------------------------------------------------------- */
  // Baseline KPI's op basis van ALLE dossiers (debts), nooit filteredDebts —
  // vereiste sponsor 2026-09-03: "Totaal dossiers" (en de andere kaarten
  // ernaast) mogen niet veranderen wanneer de gebruiker filtert, anders
  // verandert de betekenis van de KPI. De tabel eronder gebruikt wel
  // filteredDebts.
  const totalOutstanding = parseFloat(
    debts.reduce((t, d) => t + (d.balance || 0), 0).toFixed(2),
  );
  const totalOwedToCfsb = parseFloat(
    debts.reduce((t, d) => t + (d.debtor_to_cfsb_balance || 0), 0).toFixed(2),
  );

  return (
    <Container maxWidth="xl">
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", sm: "flex-start" }}
        spacing={2}
        sx={{ mt: { xs: 1.5, sm: 4 } }}
      >
        <Box>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Welkom, {user?.fullname}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Hier vindt u al uw openstaande dossiers, bedragen en beschikbare
            acties.
          </Typography>
        </Box>

        <Button
          color="primary"
          variant="contained"
          onClick={() => router.push("/financial-report")}
          sx={{ textTransform: "none" }}
        >
          Financiële Verklaring aanvragen
        </Button>
      </Stack>

      <DashboardHeader
        key={filtersKey}
        total={totalOutstanding}
        openToCfsb={totalOwedToCfsb}
        count={debts.length}
        blockadeActiveCount={blockadeActiveCount}
        tenants={tenants}
        onSearch={handleSearch}
        onTenantChange={handleTenantChange}
        onStatusChange={handleStatusChange}
        onPaymentStatusChange={handlePaymentStatusChange}
        onReset={handleResetFilters}
      />

      <Suspense fallback={<h1>Loading collection cases...</h1>}>
        {(() => {
          const columns: ListColumn<DebtorSummary>[] = [
            {
              key: "tenant_name",
              label: "Deelnemer",
              render: (debt) => debt.tenant_name,
            },
            {
              key: "reference",
              label: "Referentie",
              render: (debt) => debt.reference,
            },
            {
              key: "issue_date",
              label: "Registratiedatum",
              render: (debt) =>
                debt.issue_date ? formatDate(debt.issue_date.toString()) : "-",
              hideOnMobile: true,
            },
            {
              key: "due_date",
              label: "Reactietermijn",
              render: (debt) => {
                if (!debt.due_date) return "-";
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
              },
              hideOnMobile: true,
            },
            {
              key: "status",
              label: "Status",
              align: "center",
              render: (debt) => {
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
              },
            },
            {
              key: "total_paid",
              label: "Totaal Betaald",
              align: "right",
              render: (debt) => formatCurrency(debt.total_paid || 0),
            },
            {
              key: "balance",
              label: "Openstaand",
              align: "right",
              render: (debt) => formatCurrency(debt.balance),
            },
            {
              key: "agreement",
              label: "Betaalregeling",
              render: (debt) => (
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
                        ? undefined
                        : "default"
                  }
                  size="small"
                  variant="outlined"
                  sx={{
                    width: 150,
                    ...(hasOpenAgreement(debt.agreement_status) &&
                      !isAgreementApproved(debt.agreement_status) && {
                        color: "#F97316",
                        borderColor: "#F97316",
                        "& .MuiChip-icon": { color: "#F97316" },
                      }),
                  }}
                />
              ),
            },
            {
              key: "actions",
              label: "Actie",
              align: "right",
              render: (debt) => (
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  justifyContent="flex-end"
                >
                  {getActionMenuItems(debt).length <= 1 && (
                    <Chip
                      icon={<TaskAltIcon fontSize="small" />}
                      label="Voltooid"
                      color="success"
                      size="small"
                      variant="outlined"
                    />
                  )}

                  <Tooltip title="Acties">
                    <IconButton
                      size="small"
                      aria-label="Acties"
                      aria-haspopup="true"
                      onClick={(event) => {
                        event.stopPropagation();
                        setActionMenuAnchorEl(event.currentTarget);
                        setActionMenuDebt(debt);
                      }}
                    >
                      <MoreVertIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              ),
            },
          ];

          return (
            <ResponsiveListTable
              columns={columns}
              rows={filteredDebts}
              getRowKey={(debt) => debt.id}
              emptyMessage="Er zijn geen dossiers die overeenkomen met uw zoekcriteria."
            />
          );
        })()}
      </Suspense>

      <Menu
        anchorEl={actionMenuAnchorEl}
        open={Boolean(actionMenuAnchorEl)}
        onClose={closeActionMenu}
      >
        {actionMenuDebt &&
          getActionMenuItems(actionMenuDebt).map((item) => (
            <MenuItem
              key={item.key}
              onClick={() => {
                item.onClick();
                closeActionMenu();
              }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText>{item.label}</ListItemText>
            </MenuItem>
          ))}
      </Menu>

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

      <PayCollectionFeeDialog
        open={openModalCollectionFee}
        onClose={() => setOpenModalCollectionFee(false)}
        debtClaimId={debtSelected?.id || ""}
        onPaid={handleCfsbPaid}
      />
    </Container>
  );
};

export default DashboardDebtor;
