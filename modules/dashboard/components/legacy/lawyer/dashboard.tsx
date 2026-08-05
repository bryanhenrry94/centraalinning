"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Box, Card, CardContent, Grid, Stack, Typography, Button } from "@mui/material";

import { getMyCaseTransfersAsLawyer } from "@/modules/legal-process/actions/case-transfer.actions";
import {
  CaseTransferStatus,
  OPEN_CASE_TRANSFER_STATUSES,
} from "@/modules/legal-process/constants/case-transfer-status";
import { LatestTransfersTable } from "@/modules/legal-process/components/latest-transfers-table";
import { notifyError } from "@/shared/ui/notifications";

const LATEST_TRANSFERS_LIMIT = 5;

type CaseTransferListItem = Awaited<ReturnType<typeof getMyCaseTransfersAsLawyer>>[number];

function MetricCard({ title, value }: { title: string; value: number }) {
  return (
    <Card>
      <CardContent>
        <Typography color="text.secondary">{title}</Typography>
        <Typography variant="h4" fontWeight={700}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
}

export const DashboardLawyer = () => {
  const [items, setItems] = useState<CaseTransferListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getMyCaseTransfersAsLawyer();
      setItems(data);
    } catch (error) {
      notifyError("Kon dossiers niet laden");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const pendingItems = items.filter(
    (item) => item.status === CaseTransferStatus.PENDING_ACCEPTANCE,
  );
  const activeCount = items.filter((item) =>
    (OPEN_CASE_TRANSFER_STATUSES as string[]).includes(item.status),
  ).length;

  return (
    <Box p={3}>
      <Typography variant="h4" fontWeight={700} mb={3}>
        Dashboard
      </Typography>

      <Grid container spacing={3} mb={3}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <MetricCard title="Nieuwe dossieroverdrachten" value={loading ? 0 : pendingItems.length} />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <MetricCard title="Actieve dossiers" value={loading ? 0 : activeCount} />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <MetricCard title="Totaal toegewezen" value={loading ? 0 : items.length} />
        </Grid>
      </Grid>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <Button
          component={Link}
          href="/legal-processes?tab=pending"
          variant="contained"
          size="large"
        >
          Nieuwe dossieroverdrachten
        </Button>
        <Button component={Link} href="/legal-processes" variant="outlined" size="large">
          Mijn gerechtelijke dossiers
        </Button>
        <Button component={Link} href="/documents" variant="outlined" size="large">
          Documenten
        </Button>
      </Stack>

      <Typography variant="h6" fontWeight={700} mt={4} mb={2}>
        Laatste dossieroverdrachten
      </Typography>
      <LatestTransfersTable items={pendingItems.slice(0, LATEST_TRANSFERS_LIMIT)} onChanged={load} />
    </Box>
  );
};
