"use client";

import { useEffect, useState } from "react";
import { usePaymentGate } from "@/modules/payment/hooks/usePaymentGate";

interface PaymentGateProps {
  feature: string;
  onContinue: () => Promise<void>;
  children?: React.ReactNode;
}

export function PaymentGate({
  feature,
  onContinue,
  children,
}: PaymentGateProps) {
  const { loading, hasAccess, paymentUrl, refresh } = usePaymentGate(feature);

  const [processing, setProcessing] = useState(false);

  const handleClick = async () => {
    // 1. si no ha pagado → abrir pago
    if (!hasAccess) {
      if (paymentUrl) {
        window.open(paymentUrl, "_blank");
      }
      return;
    }

    // 2. si ya pagó → ejecutar acción
    setProcessing(true);
    await onContinue();
    setProcessing(false);
  };

  // Mejora PRO
  useEffect(() => {
    if (hasAccess) return;

    const interval = setInterval(() => {
      refresh();
    }, 5000);

    return () => clearInterval(interval);
  }, [hasAccess]);

  return (
    <div className="flex flex-col gap-3">
      <button onClick={handleClick} disabled={loading || processing}>
        {loading
          ? "Controleren..."
          : hasAccess
            ? "Doorgaan"
            : "Betalen om door te gaan"}
      </button>

      {!hasAccess && <button onClick={refresh}>Ik heb betaald, controleren</button>}

      {children}
    </div>
  );
}
