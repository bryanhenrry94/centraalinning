"use client";
import React, { useEffect } from "react";
import { Box, Skeleton } from "@mui/material";
import { CollectionHeader } from "@/modules/collection/components/collection-header";
import { DebtClaimResponse } from "@/modules/collection/services/collection.type";
import { useAuthSession } from "@/modules/auth/hooks/useAuthSession";
import { getDebtClaimsAction } from "@/modules/collection/actions/collection-case.actions";
import CollectionTable from "@/modules/collection/components/collection-table";

export default function CollectionsPage() {
  const { session } = useAuthSession();
  const [invoices, setInvoices] = React.useState<DebtClaimResponse[]>([]);

  const [loading, setLoading] = React.useState(false);

  const fetchInvoices = React.useCallback(async () => {
    if (!session?.user?.tenant_id) return;

    try {
      setLoading(true);

      const invoices = await getDebtClaimsAction({
        tenantId: session.user.tenant_id,
      });

      setInvoices(invoices);
    } finally {
      setLoading(false);
    }
  }, [session?.user?.tenant_id]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handleRefresh = async () => {
    await fetchInvoices();
  };

  return (
    <Box sx={{ m: 4, display: "flex", flexDirection: "column", gap: 2 }}>
      <CollectionHeader onRefresh={handleRefresh} />
      {loading ? (
        <Skeleton variant="rectangular" width={"100%"} height={200} />
      ) : (
        <CollectionTable invoices={invoices} />
      )}
    </Box>
  );
}
