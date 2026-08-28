"use client";
import React, { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Box, Button, Chip, Container, Stack, Typography } from "@mui/material";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import HandshakeIcon from "@mui/icons-material/Handshake";
import HistoryIcon from "@mui/icons-material/History";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";

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

  const handlePay = (debt: DebtorSummary) => {
    setTransferDebt(debt);
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
    <Container maxWidth="xl">
      <Box sx={{ mt: { xs: 1.5, sm: 4 }, mb: 2 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
          Betalen
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Overzicht van openstaande bedragen en betalingen.
        </Typography>
      </Box>

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
            key: "outstanding",
            label: "Openstaand",
            render: (debt) => (
              <Stack spacing={1} alignItems="flex-end">
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Aan deelnemer
                  </Typography>
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
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    CFSB-kosten
                  </Typography>
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
                </Box>
              </Stack>
            ),
          },
          {
            key: "actions",
            label: "Actie",
            render: (debt) => (
              <Stack spacing={1} alignItems="center">
                <Tooltip title="Betalingsoverzicht">
                  <IconButton size="small" onClick={() => setHistoryDebtId(debt.id)}>
                    <HistoryIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Button
                  size="small"
                  variant="contained"
                  color="error"
                  startIcon={<AttachMoneyIcon fontSize="small" />}
                  onClick={() => handlePay(debt)}
                  disabled={debt.debtor_to_participant_balance <= 0}
                  fullWidth
                >
                  Aan deelnemer betalen
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<AccountBalanceIcon fontSize="small" />}
                  onClick={() => setCollectionFeeDebtId(debt.id)}
                  disabled={debt.debtor_to_cfsb_balance <= 0}
                  fullWidth
                >
                  CFSB-kosten betalen
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="secondary"
                  startIcon={<HandshakeIcon fontSize="small" />}
                  onClick={() => handleBetaalregelingClick(debt)}
                  fullWidth
                >
                  {hasOpenAgreement(debt.agreement_status) ? "Regeling" : "Regeling aanvragen"}
                </Button>
              </Stack>
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
        onPaid={fetchDebts}
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
