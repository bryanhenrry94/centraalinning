"use client";
import React, { useEffect, useState } from "react";
import { notifyError } from "@/shared/ui/notifications";
import { requestStartCollectiveCollection } from "@/modules/collective-follow-up/actions/collective-collection.actions";
import { getParameterForTenantAction } from "@/modules/settings/actions/parameter.actions";
import { PaymentIntent } from "@/modules/payment/components/PaymentIntent";
import { PaymentConfirmDialog } from "@/shared/ui/payment-confirm-dialog";
import { calculateAbb } from "@/shared/utils/abb";

// Solo para mostrar el monto antes de pagar — el monto real y autoritativo
// se calcula server-side en CollectiveCollectionService.requestStart. No se
// importa desde modules/collective-follow-up/constants/ porque ese archivo
// reexporta un enum de @prisma/client y este es un componente "use client".
const COP_START_FEE_RATE = 0.05;

interface StartCopDialogProps {
  open: boolean;
  onClose: () => void;
  debtClaimId: string;
  principalAmount: number;
  onStarted: (collectionId: string) => void;
}

export const StartCopDialog: React.FC<StartCopDialogProps> = ({
  open,
  onClose,
  debtClaimId,
  principalAmount,
  onStarted,
}) => {
  const [collectionId, setCollectionId] = useState<string | null>(null);
  const [abbRate, setAbbRate] = useState<number>(0);

  useEffect(() => {
    if (!open) return;

    const fetchAbbRate = async () => {
      try {
        const parameter = await getParameterForTenantAction();
        setAbbRate(parameter?.abb_rate ?? 0);
      } catch (error) {
        console.error("Error fetching ABB rate:", error);
      }
    };

    fetchAbbRate();
  }, [open]);

  // De 5%-startvergoeding is netto (excl. ABB) — de deelnemer ziet en
  // betaalt altijd vergoeding + ABB bovenop (zelfde regel als BLC/Financieel
  // Rapport), nooit ABB die uit het totaal wordt teruggerekend.
  const feeAmount = principalAmount * COP_START_FEE_RATE;
  const { total: totalAmount } = calculateAbb(feeAmount, abbRate);

  const handleCreateTransaction = async () => {
    try {
      const result = await requestStartCollectiveCollection({ debtClaimId });
      setCollectionId(result.collectionId);
      return {
        success: true,
        paymentId: result.paymentId,
        paymentUrl: result.paymentUrl,
      };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Kon de Collectieve Opvolging niet aanvragen";
      notifyError(message);
      return { success: false, error: message };
    }
  };

  const handlePaymentConfirmed = async () => {
    if (collectionId) {
      onStarted(collectionId);
    }
    onClose();
  };

  return (
    <PaymentConfirmDialog
      open={open}
      onClose={onClose}
      title="Betaling bevestigen"
      lineItems={[]}
      total={totalAmount}
      totalLabel="CFSB-kosten"
      helperText=""
      payAction={
        <PaymentIntent
          onCreateTransaction={handleCreateTransaction}
          onPaymentConfirmed={handlePaymentConfirmed}
        />
      }
    />
  );
};
