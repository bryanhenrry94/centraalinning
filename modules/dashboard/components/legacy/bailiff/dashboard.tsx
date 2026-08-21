"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Box,
  Card,
  CardContent,
  Grid,
  Stack,
  Typography,
  Button,
  Paper,
} from "@mui/material";

import { getMyLegalProcessesAsBailiff } from "@/modules/legal-process/actions/legal-process.actions";
import { getMyCaseTransfersAsBailiff } from "@/modules/legal-process/actions/case-transfer.actions";
import { OPEN_LEGAL_PROCESS_STATUSES } from "@/modules/legal-process/constants/legal-process-status";
import { CaseTransferStatus } from "@/modules/legal-process/constants/case-transfer-status";
import { LatestTransfersTable } from "@/modules/legal-process/components/latest-transfers-table";
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

  // Igual que DashboardLawyer: aceptar/rechazar solo tiene sentido antes de
  // la aceptación, así que la tabla se limita a PENDING_ACCEPTANCE (no
  // incluye WORK_COMPLETED, que ya está aceptado y solo espera el vonnis).
  const pendingAcceptanceItems = caseTransfers.filter(
    (item) => item.status === CaseTransferStatus.PENDING_ACCEPTANCE,
  );

  return (
    <Box p={3}>
      <Typography variant="h4" fontWeight={700} mb={3}>
        Dashboard
      </Typography>

      <Grid container spacing={3} mb={3}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <MetricCard
            title="Mijn dossiers"
            value={loading ? 0 : pendingCount}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <MetricCard
            title="Actieve dossiers"
            value={loading ? 0 : activeCount}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <MetricCard
            title="Totaal toegewezen"
            value={loading ? 0 : totalCount}
          />
        </Grid>
      </Grid>

      <Paper
        variant="outlined"
        sx={{ p: 2.5, borderRadius: 2, bgcolor: "white", mb: 3 }}
      >
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ mb: 1.5 }}
        >
          <Typography variant="subtitle1" fontWeight={700}>
            Mijn dossiers
          </Typography>
          <Button
            component={Link}
            href="/legal-processes?tab=pending"
            size="small"
          >
            Bekijk alle
          </Button>
        </Stack>
        <LatestTransfersTable items={pendingAcceptanceItems} onChanged={load} />
      </Paper>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <Button
          component={Link}
          href="/legal-processes"
          variant="contained"
          size="large"
        >
          Mijn dossiers
        </Button>
        <Button
          component={Link}
          href="/documents"
          variant="outlined"
          size="large"
        >
          Documenten
        </Button>
      </Stack>
    </Box>
  );
};
