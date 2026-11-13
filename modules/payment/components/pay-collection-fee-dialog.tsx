"use client";
import React, { useEffect, useState } from "react";
import { Box, CircularProgress, Typography } from "@mui/material";
import {
  getDebtorCollectionFeeObligations,
  requestDebtorCollectionFeePayment,
} from "@/modules/collection/actions/debtor.actions";
import { PaymentIntent } from "@/modules/payment/components/PaymentIntent";
import { PaymentConfirmDialog } from "@/shared/ui/payment-confirm-dialog";

interface PayCollectionFeeDialogProps {
  open: boolean;
  onClose: () => void;
  debtClaimId: string;
  onPaid: () => void;
}

// Pago de la(s) comisión(es) CFSB a cargo del DEUDOR. Administrativamente
// pueden ser varias obligaciones separadas (el registro del AOP + recargos
// posteriores por falta de respuesta a la aanmaning/sommatie, ver
// CollectionService.applyNoResponseFee) — pero para el deudor se presenta
// como un solo total con un solo botón de pago; el reparto interno hacia
// cada obligación se resuelve vía PaymentAllocation
// (CollectionService.requestDebtorCollectionFeePayment).
export const PayCollectionFeeDialog: React.FC<PayCollectionFeeDialogProps> = ({
  open,
  onClose,
  debtClaimId,
  onPaid,
}) => {
  const [loading, setLoading] = useState(true);
  const [obligations, setObligations] = useState<
    Awaited<ReturnType<typeof getDebtorCollectionFeeObligations>>
  >([]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    getDebtorCollectionFeeObligations(debtClaimId)
      .then((rows) => setObligations(rows.filter((o) => o.balanceAmount > 0)))
      .finally(() => setLoading(false));
  }, [open, debtClaimId]);

  const total = obligations.reduce((sum, o) => sum + o.balanceAmount, 0);

  const handleCreateTransaction = async () => {
    try {
      const result = await requestDebtorCollectionFeePayment(debtClaimId);
      return {
        success: true,
        paymentId: result.paymentId,
        paymentUrl: result.paymentUrl,
      };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Kon de betaling niet aanmaken";
      return { success: false, error: message };
    }
  };

  const handlePaymentConfirmed = async () => {
    onPaid();
    onClose();
  };

  if (loading || obligations.length === 0) {
    return (
      <PaymentConfirmDialog
        open={open}
        onClose={onClose}
        title="CFSB-kosten"
        lineItems={[]}
        total={0}
        helperText={
          loading
            ? undefined
            : "Geen openstaande CFSB-kosten voor dit dossier."
        }
        payAction={
          loading ? (
            <Box display="flex" justifyContent="center" flex={1} py={1}>
              <CircularProgress size={28} />
            </Box>
          ) : null
        }
      />
    );
  }

  return (
    <PaymentConfirmDialog
      open={open}
      onClose={onClose}
      title="CFSB-kosten"
      lineItems={[]}
      total={total}
      helperText="U betaalt de openstaande CFSB-kosten rechtstreeks aan CFSB. Deze kosten staan los van het bedrag dat u aan de deelnemer verschuldigd bent."
      payAction={
        <PaymentIntent
          onCreateTransaction={handleCreateTransaction}
          onPaymentConfirmed={handlePaymentConfirmed}
        />
      }
    />
  );
};
