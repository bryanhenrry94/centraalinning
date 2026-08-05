"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Box, Card, CardContent, Grid, Stack, Typography, Button } from "@mui/material";

import { getMyLegalProcessesAsBailiff } from "@/modules/legal-process/actions/legal-process.actions";
import { getMyCaseTransfersAsBailiff } from "@/modules/legal-process/actions/case-transfer.actions";
import { OPEN_LEGAL_PROCESS_STATUSES } from "@/modules/legal-process/constants/legal-process-status";
import { CaseTransferStatus } from "@/modules/legal-process/constants/case-transfer-status";
import { notifyError } from "@/shared/ui/notifications";

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

export const DashboardBailiff = () => {
  const [legalProcesses, setLegalProcesses] = useState<
    Awaited<ReturnType<typeof getMyLegalProcessesAsBailiff>>
  >([]);
  const [caseTransfers, setCaseTransfers] = useState<
    Awaited<ReturnType<typeof getMyCaseTransfersAsBailiff>>
  >([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [legalProcessData, caseTransferData] = await Promise.all([
        getMyLegalProcessesAsBailiff(),
        getMyCaseTransfersAsBailiff(),
      ]);
      setLegalProcesses(legalProcessData);
      setCaseTransfers(caseTransferData);
    } catch (error) {
      notifyError("Kon dossiers niet laden");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Pendiente de aceptación (bailiff-directo) o esperando registro de
  // vonnis tras el trabajo finalizado del abogado.
  const PENDING_BAILIFF_STATUSES: CaseTransferStatus[] = [
    CaseTransferStatus.PENDING_ACCEPTANCE,
    CaseTransferStatus.WORK_COMPLETED,
  ];
  const pendingCount = caseTransfers.filter((item) =>
    PENDING_BAILIFF_STATUSES.includes(item.status),
  ).length;
  const activeCount = legalProcesses.filter((item) =>
    (OPEN_LEGAL_PROCESS_STATUSES as string[]).includes(item.status),
  ).length;
  const totalCount = legalProcesses.length + caseTransfers.length;

  return (
    <Box p={3}>
      <Typography variant="h4" fontWeight={700} mb={3}>
        Dashboard
      </Typography>

      <Grid container spacing={3} mb={3}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <MetricCard title="Nieuwe overdrachten" value={loading ? 0 : pendingCount} />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <MetricCard title="Actieve dossiers" value={loading ? 0 : activeCount} />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <MetricCard title="Totaal toegewezen" value={loading ? 0 : totalCount} />
        </Grid>
      </Grid>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <Button
          component={Link}
          href="/legal-processes?tab=pending"
          variant="contained"
          size="large"
        >
          Nieuwe overdrachten
        </Button>
        <Button component={Link} href="/legal-processes" variant="outlined" size="large">
          Expedienten GOP
        </Button>
        <Button component={Link} href="/documents" variant="outlined" size="large">
          Documenten
        </Button>
      </Stack>
    </Box>
  );
};
