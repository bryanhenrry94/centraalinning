"use client";
import React, { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Box, Button, Chip, Container, Typography } from "@mui/material";
import HandshakeIcon from "@mui/icons-material/Handshake";

import { formatCurrency } from "@/shared/utils/formatters";
import { ListColumn, ResponsiveListTable } from "@/shared/ui/responsive-list-table";
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

      {(() => {
        const columns: ListColumn<DebtorSummary>[] = [
          { key: "tenant_name", label: "Deelnemer", render: (debt) => debt.tenant_name },
          { key: "reference", label: "Referentie", render: (debt) => debt.reference, hideOnMobile: true },
          {
            key: "outstanding",
            label: "Openstaand",
            align: "right",
            render: (debt) => formatCurrency(debt.debtor_to_participant_balance),
          },
          {
            key: "status",
            label: "Regeling",
            render: (debt) =>
              isAgreementApproved(debt.agreement_status) ? (
                <Chip label="Actief" color="info" size="small" />
              ) : isAgreementPending(debt.agreement_status) ? (
                <Chip label="In behandeling" color="warning" size="small" />
              ) : (
                <Chip label="Geen" size="small" />
              ),
          },
          {
            key: "actions",
            label: "Actie",
            render: (debt) => (
              <Button
                size="small"
                variant="outlined"
                startIcon={<HandshakeIcon fontSize="small" />}
                disabled={debt.debtor_to_participant_balance <= 0}
                onClick={() => openAgreementModal(debt)}
              >
                Aanvragen
              </Button>
            ),
          },
        ];

        return (
          <ResponsiveListTable
            columns={columns}
            rows={debts}
            getRowKey={(debt) => debt.id}
            emptyMessage="Geen dossiers gevonden."
          />
        );
      })()}

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
        outstandingAmount={debtSelected?.debtor_to_participant_balance}
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
