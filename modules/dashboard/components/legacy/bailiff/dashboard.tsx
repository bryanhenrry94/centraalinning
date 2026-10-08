"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Box,
  Container,
  Grid,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import GavelOutlinedIcon from "@mui/icons-material/GavelOutlined";
import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import AccessTimeOutlinedIcon from "@mui/icons-material/AccessTimeOutlined";
import PlayCircleOutlineOutlinedIcon from "@mui/icons-material/PlayCircleOutlineOutlined";
import CheckCircleOutlineOutlinedIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import HelpOutlineOutlinedIcon from "@mui/icons-material/HelpOutlineOutlined";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

import StatCard from "@/modules/dashboard/components/StatCard";
import { getMyLegalProcessesAsBailiff } from "@/modules/legal-process/actions/legal-process.actions";
import { getMyCaseTransfersAsBailiff } from "@/modules/legal-process/actions/case-transfer.actions";
import {
  LegalProcessStatus,
  OPEN_LEGAL_PROCESS_STATUSES,
} from "@/modules/legal-process/constants/legal-process-status";
import { CaseTransferStatus } from "@/modules/legal-process/constants/case-transfer-status";
import { LatestTransfersTable } from "@/modules/legal-process/components/latest-transfers-table";
import { notifyError } from "@/shared/ui/notifications";

const LATEST_TRANSFERS_LIMIT = 5;

const QUICK_ACTIONS = [
  {
    label: "Mijn dossiers",
    description: "Overzicht van al uw toegewezen dossiers",
    href: "/legal-processes",
    icon: <GavelOutlinedIcon fontSize="small" />,
  },
  // {
  //   label: "Vonnissen",
  //   description: "Geregistreerde vonnissen en GOP-opvolging",
  //   href: "/verdicts",
  //   icon: <ArticleOutlinedIcon fontSize="small" />,
  // },
  // {
  //   label: "Documenten",
  //   description: "Bijlagen en dossierdocumenten",
  //   href: "/documents",
  //   icon: <DescriptionOutlinedIcon fontSize="small" />,
  // },
  {
    label: "Feedback & Ondersteuning",
    description: "Tip, klacht of technisch probleem melden",
    href: "/support",
    icon: <HelpOutlineOutlinedIcon fontSize="small" />,
  },
];

export const DashboardBailiff = () => {
  const theme = useTheme();
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

  // Igual que showVerdictButton (transfers/[id]/page.tsx) y
  // VERDICT_ELIGIBLE_STATUSES (legal-processes/page.tsx): el alguacil puede
  // registrar el vonnis una vez aceptado el dossier-directo, o cuando el
  // abogado ya finalizó su trabajo y lo transfirió.
  const VERDICT_ELIGIBLE_STATUSES: CaseTransferStatus[] = [
    CaseTransferStatus.ACCEPTED,
    CaseTransferStatus.WORK_COMPLETED,
  ];
  const verdictEligibleCount = caseTransfers.filter((item) =>
    VERDICT_ELIGIBLE_STATUSES.includes(item.status),
  ).length;
  const activeCount = legalProcesses.filter((item) =>
    (OPEN_LEGAL_PROCESS_STATUSES as string[]).includes(item.status),
  ).length;
  const completedCount = legalProcesses.filter(
    (item) => item.status === LegalProcessStatus.CLOSED,
  ).length;
  const totalCount = legalProcesses.length + caseTransfers.length;

  // Igual que DashboardLawyer: aceptar/rechazar solo tiene sentido antes de
  // la aceptación, así que la tabla se limita a PENDING_ACCEPTANCE (no
  // incluye WORK_COMPLETED, que ya está aceptado y solo espera el vonnis).
  const pendingAcceptanceItems = caseTransfers.filter(
    (item) => item.status === CaseTransferStatus.PENDING_ACCEPTANCE,
  );

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 1.5, sm: 4 } }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={700}>
          Deurwaarder Dashboard
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Welkom terug. Hieronder een overzicht van uw dossiers.
        </Typography>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }}>
          <StatCard
            title="Totaal dossiers"
            value={loading ? 0 : totalCount}
            subtitle="dossiers"
            color={theme.palette.info.main}
            icon={<DescriptionOutlinedIcon />}
            href="/legal-processes"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }}>
          <StatCard
            title="In afwachting van acceptatie"
            value={loading ? 0 : pendingAcceptanceItems.length}
            subtitle="dossiers"
            color={theme.palette.warning.main}
            icon={<AccessTimeOutlinedIcon />}
            href="/legal-processes?tab=pending"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }}>
          <StatCard
            title="Vonnis registreren"
            value={loading ? 0 : verdictEligibleCount}
            subtitle="dossiers"
            color={theme.palette.primary.main}
            icon={<GavelOutlinedIcon />}
            href="/legal-processes"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }}>
          <StatCard
            title="In uitvoering"
            value={loading ? 0 : activeCount}
            subtitle="dossiers"
            color={theme.palette.success.main}
            icon={<PlayCircleOutlineOutlinedIcon />}
            href="/legal-processes"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }}>
          <StatCard
            title="Afgerond"
            value={loading ? 0 : completedCount}
            subtitle="dossiers"
            color={theme.palette.success.main}
            icon={<CheckCircleOutlineOutlinedIcon />}
            href="/legal-processes"
          />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper
            variant="outlined"
            sx={{ p: 2.5, borderRadius: 2, bgcolor: "white" }}
          >
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{ mb: 1.5 }}
            >
              <Typography variant="subtitle1" fontWeight={700}>
                Nieuwe dossieroverdrachten
              </Typography>
            </Stack>
            <LatestTransfersTable
              items={pendingAcceptanceItems.slice(0, LATEST_TRANSFERS_LIMIT)}
              onChanged={load}
            />
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Paper
            variant="outlined"
            sx={{ p: 2.5, borderRadius: 2, bgcolor: "white" }}
          >
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
              Snelle acties
            </Typography>
            <List disablePadding>
              {QUICK_ACTIONS.map((action) => (
                <ListItemButton
                  key={action.href}
                  component={Link}
                  href={action.href}
                  sx={{ borderRadius: 1.5, mb: 0.5 }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    {action.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={action.label}
                    secondary={action.description}
                    slotProps={{
                      primary: { variant: "body2", fontWeight: 600 },
                      secondary: { variant: "caption" },
                    }}
                  />
                  <ChevronRightIcon fontSize="small" color="action" />
                </ListItemButton>
              ))}
            </List>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};
