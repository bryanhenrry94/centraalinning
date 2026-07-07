"use client";

import { useEffect, useState } from "react";

export function usePaymentGate(feature: string) {
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);

  const fetchStatus = async () => {
    setLoading(true);

    const res = await fetch(`/api/payments/status?feature=${feature}`);

    const data = await res.json();

    setHasAccess(data.hasAccess);
    setPaymentUrl(data.paymentUrl);
    setLoading(false);
  };

  useEffect(() => {
    fetchStatus();
  }, [feature]);

  return {
    loading,
    hasAccess,
    paymentUrl,
    refresh: fetchStatus,
  };
}
