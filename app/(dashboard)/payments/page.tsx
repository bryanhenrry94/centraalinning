"use client";
import React, { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  Box,
  Chip,
  Container,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Typography,
} from "@mui/material";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import HandshakeIcon from "@mui/icons-material/Handshake";
import HistoryIcon from "@mui/icons-material/History";
import MoreVertIcon from "@mui/icons-material/MoreVert";

import { formatCurrency } from "@/shared/utils/formatters";
import { ListColumn, ResponsiveListTable } from "@/shared/ui/responsive-list-table";
import { notifyError } from "@/shared/ui/notifications";
import {
  getDebtorByUserId,
  getDebts,
} from "@/modules/collection/actions/debtor.actions";
import { DebtorSummary } from "@/modules/collection/types/DebtorSummary";
import { TransferPaymentDialog } from "@/modules/payment/components/transfer-payment-dialog";
import { PayCollectionFeeDialog } from "@/modules/payment/components/pay-collection-fee-dialog";
import { getSourceStatusInfo } from "@/modules/collection/utils/debt-claim-status";
import { PaymentsDialog } from "@/modules/payment/components/payments-dialog";
import { getAgreementsByDebtClaimId } from "@/modules/agreement/actions/agreement.actions";
import { AgreementResponse } from "@/modules/agreement/services/agreement.validators";
import { AgreementDialog } from "@/modules/agreement/components/agreement-dialog";
import { AgreementFormDialog } from "@/modules/agreement/components/agreement-form-dialog";
import {
  AgreementStatus,
  hasOpenAgreement,
} from "@/modules/agreement/constants/agreement-status";

const PaymentsPage = () => {
  const { data: session } = useSession();
  const user = session?.user;

  const [debts, setDebts] = useState<DebtorSummary[]>([]);
  const [historyDebtId, setHistoryDebtId] = useState<string | null>(null);
  const [transferDebt, setTransferDebt] = useState<DebtorSummary | null>(null);
  const [collectionFeeDebtId, setCollectionFeeDebtId] = useState<string | null>(null);
  const [agreementDebt, setAgreementDebt] = useState<DebtorSummary | null>(
    null,
  );
  const [openModalAgreement, setOpenModalAgreement] = useState(false);
  const [openModalAgreementView, setOpenModalAgreementView] = useState(false);
  const [agreements, setAgreements] = useState<AgreementResponse[]>([]);
  // Onthoudt de deelnemer-betaling die moet volgen zodra de CFSB-kosten voor
  // hetzelfde dossier bevestigd zijn (zie handleBetalenClick/handleCfsbPaid).
  const [pendingParticipantDebt, setPendingParticipantDebt] =
    useState<DebtorSummary | null>(null);

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [selectedDebt, setSelectedDebt] = useState<DebtorSummary | null>(null);
  const menuOpen = Boolean(anchorEl);

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedDebt(null);
  };

  const fetchDebts = useCallback(async () => {
    if (!user?.id || !user?.tenant_id) return;

    try {
      const debtor = await getDebtorByUserId(user.id, user.tenant_id);
      if (!debtor) {
        notifyError("Geen debiteur gevonden voor deze gebruiker");
        return;
      }

      const response = await getDebts({ debtor_id: debtor.id });
      if (response.success) {
        setDebts(response.data || []);
      }
    } catch (error) {
      console.error("Error fetching debts:", error);
      notifyError("Fout bij het ophalen van schulden");
    }
  }, [user?.id, user?.tenant_id]);

  useEffect(() => {
    fetchDebts();
  }, [fetchDebts]);

  // Eén knop "Betalen" die de debiteur door beide betaalstromen leidt: als er
  // nog CFSB-kosten openstaan, wordt eerst dát dialoogvenster getoond; pas
  // zodra die betaling bevestigd is (handleCfsbPaid), verschijnt meteen het
  // dialoogvenster om het bewijs van de betaling aan de deelnemer te uploaden.
  const handleBetalenClick = (debt: DebtorSummary) => {
    if (debt.debtor_to_cfsb_balance > 0) {
      setCollectionFeeDebtId(debt.id);
      setPendingParticipantDebt(debt);
      return;
    }
    if (debt.debtor_to_participant_balance > 0) {
      setTransferDebt(debt);
    }
  };

  const handleCfsbPaid = async () => {
    await fetchDebts();
    if (pendingParticipantDebt && pendingParticipantDebt.debtor_to_participant_balance > 0) {
      setTransferDebt(pendingParticipantDebt);
    }
    setPendingParticipantDebt(null);
  };

  const handleBetaalregelingClick = async (debt: DebtorSummary) => {
    if (hasOpenAgreement(debt.agreement_status)) {
      setAgreementDebt(debt);
      const response = await getAgreementsByDebtClaimId(debt.id);
      setAgreements(response || []);
      setOpenModalAgreementView(true);
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

    setAgreementDebt(debt);
    setOpenModalAgreement(true);
  };

  const onSaveAgreement = async () => {
    setOpenModalAgreement(false);
    await fetchDebts();
  };

  const outstandingDebts = debts.filter((d) => d.balance > 0);

  return (
    <Container
      maxWidth="xl"
      disableGutters
      sx={{ px: { xs: 1, sm: 3 }, py: { xs: 1.5, sm: 4 } }}
    >
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
        gap={6}
        flexWrap="wrap"
      >
        <Box>
          <Typography variant="h4" fontWeight={700}>
            Betalen
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Overzicht van openstaande bedragen en betalingen.
          </Typography>
        </Box>
      </Stack>

      {(() => {
        const columns: ListColumn<DebtorSummary>[] = [
          { key: "tenant_name", label: "Deelnemer", render: (debt) => debt.tenant_name },
          { key: "reference", label: "Referentie", render: (debt) => debt.reference, hideOnMobile: true },
          {
            key: "status",
            label: "Status",
            render: (debt) => (
              <Chip
                label={getSourceStatusInfo(debt.source_status).label}
                color={getSourceStatusInfo(debt.source_status).color}
                size="small"
              />
            ),
          },
          {
            key: "to_participant",
            label: "Aan deelnemer",
            align: "right",
            render: (debt) => (
              <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end">
                <Typography variant="body2" fontWeight={600}>
                  {formatCurrency(debt.debtor_to_participant_balance)}
                </Typography>
                <Chip
                  size="small"
                  label={debt.debtor_to_participant_balance > 0 ? "Openstaand" : "Betaald"}
                  color={debt.debtor_to_participant_balance > 0 ? "warning" : "success"}
                />
              </Stack>
            ),
          },
          {
            key: "to_cfsb",
            label: "CFSB-kosten",
            align: "right",
            render: (debt) => (
              <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end">
                <Typography variant="body2" fontWeight={600}>
                  {formatCurrency(debt.debtor_to_cfsb_balance)}
                </Typography>
                <Chip
                  size="small"
                  label={debt.debtor_to_cfsb_balance > 0 ? "Openstaand" : "Betaald"}
                  color={debt.debtor_to_cfsb_balance > 0 ? "warning" : "success"}
                />
              </Stack>
            ),
          },
          {
            key: "actions",
            label: "Acties",
            align: "right",
            render: (debt) => (
              <IconButton
                aria-label="Acties"
                aria-haspopup="true"
                size="small"
                onClick={(event) => {
                  event.stopPropagation();
                  setAnchorEl(event.currentTarget);
                  setSelectedDebt(debt);
                }}
              >
                <MoreVertIcon fontSize="small" />
              </IconButton>
            ),
          },
        ];

        return (
          <ResponsiveListTable
            columns={columns}
            rows={outstandingDebts}
            getRowKey={(debt) => debt.id}
            emptyMessage="Geen openstaande bedragen."
          />
        );
      })()}

      <Menu anchorEl={anchorEl} open={menuOpen} onClose={handleMenuClose}>
        <MenuItem
          onClick={() => {
            if (!selectedDebt) return;
            setHistoryDebtId(selectedDebt.id);
            handleMenuClose();
          }}
        >
          <ListItemIcon>
            <HistoryIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Betalingsoverzicht</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (!selectedDebt) return;
            handleBetalenClick(selectedDebt);
            handleMenuClose();
          }}
          disabled={!selectedDebt || selectedDebt.balance <= 0}
        >
          <ListItemIcon>
            <AttachMoneyIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>
            {selectedDebt && selectedDebt.debtor_to_cfsb_balance > 0
              ? "Betalen (CFSB-kosten eerst)"
              : "Betalen"}
          </ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (!selectedDebt) return;
            handleBetaalregelingClick(selectedDebt);
            handleMenuClose();
          }}
        >
          <ListItemIcon>
            <HandshakeIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>
            {selectedDebt && hasOpenAgreement(selectedDebt.agreement_status)
              ? "Regeling bekijken"
              : "Regeling aanvragen"}
          </ListItemText>
        </MenuItem>
      </Menu>

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

      <PayCollectionFeeDialog
        open={!!collectionFeeDebtId}
        onClose={() => setCollectionFeeDebtId(null)}
        debtClaimId={collectionFeeDebtId || ""}
        onPaid={handleCfsbPaid}
      />

      <AgreementFormDialog
        open={openModalAgreement}
        onClose={() => setOpenModalAgreement(false)}
        title="Betalingsregeling aanvragen"
        onSave={onSaveAgreement}
        debtClaim_id={agreementDebt?.id || ""}
        referenceLabel={
          agreementDebt
            ? `${agreementDebt.reference || agreementDebt.id} – ${agreementDebt.tenant_name}`
            : undefined
        }
        outstandingAmount={agreementDebt?.debtor_to_participant_balance}
        initialData={{
          debtClaim_id: agreementDebt?.id || "",
          total_amount: agreementDebt?.amount || 0,
          installments_count: 1,
          installment_amount: 0,
          start_date: new Date(
            new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0),
          ),
          end_date: new Date(),
          status: AgreementStatus.PENDING,
          debtor_id: agreementDebt?.debtor_id,
          comment: "",
        }}
      />

      <AgreementDialog
        open={openModalAgreementView}
        onClose={() => setOpenModalAgreementView(false)}
        agreements={agreements}
      />
    </Container>
  );
};

export default PaymentsPage;
