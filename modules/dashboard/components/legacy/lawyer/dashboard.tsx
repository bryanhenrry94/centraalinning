"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Alert,
  Box,
  Button,
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
import GavelOutlinedIcon from "@mui/icons-material/GavelOutlined";
import MoveToInboxOutlinedIcon from "@mui/icons-material/MoveToInboxOutlined";
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import HelpOutlineOutlinedIcon from "@mui/icons-material/HelpOutlineOutlined";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

import StatCard from "@/modules/dashboard/components/StatCard";
import { getMyCaseTransfersAsLawyer } from "@/modules/legal-process/actions/case-transfer.actions";
import {
  CaseTransferStatus,
  OPEN_CASE_TRANSFER_STATUSES,
} from "@/modules/legal-process/constants/case-transfer-status";
import { LatestTransfersTable } from "@/modules/legal-process/components/latest-transfers-table";
import { notifyError } from "@/shared/ui/notifications";

const LATEST_TRANSFERS_LIMIT = 5;

type CaseTransferListItem = Awaited<
  ReturnType<typeof getMyCaseTransfersAsLawyer>
>[number];

const QUICK_ACTIONS = [
  {
    label: "Nieuwe dossieroverdrachten",
    description: "Bekijk en accepteer wachtende overdrachten",
    href: "/legal-processes?tab=pending",
    icon: <MoveToInboxOutlinedIcon fontSize="small" />,
  },
  {
    label: "Mijn gerechtelijke dossiers",
    description: "Overzicht van al uw toegewezen dossiers",
    href: "/legal-processes",
    icon: <GavelOutlinedIcon fontSize="small" />,
  },
  {
    label: "Documenten",
    description: "Processtukken en bijlagen per dossier",
    href: "/documents",
    icon: <DescriptionOutlinedIcon fontSize="small" />,
  },
  {
    label: "Feedback & Ondersteuning",
    description: "Tip, klacht of technisch probleem melden",
    href: "/support",
    icon: <HelpOutlineOutlinedIcon fontSize="small" />,
  },
];

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
    <Container maxWidth="xl" sx={{ py: { xs: 1.5, sm: 4 } }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={700}>
          Advocaat Dashboard
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Welkom terug. Hieronder een overzicht van uw dossiers.
        </Typography>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <StatCard
            title="Mijn dossiers"
            value={loading ? 0 : pendingItems.length}
            subtitle="wachten op actie"
            color="#E67E22"
            icon={<MoveToInboxOutlinedIcon />}
            href="/legal-processes?tab=pending"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <StatCard
            title="In behandeling door advocaat"
            value={loading ? 0 : activeCount}
            subtitle="actieve dossiers"
            color="#0C284C"
            icon={<AssignmentOutlinedIcon />}
            href="/legal-processes"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <StatCard
            title="Totaal toegewezen"
            value={loading ? 0 : items.length}
            subtitle="dossiers"
            color="#00897b"
            icon={<GavelOutlinedIcon />}
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
            <LatestTransfersTable
              items={pendingItems.slice(0, LATEST_TRANSFERS_LIMIT)}
              onChanged={load}
            />
          </Paper>

          <Alert
            severity="info"
            icon={<InfoOutlinedIcon />}
            sx={{ mt: 2, borderRadius: 2 }}
          >
            <Typography variant="subtitle2" fontWeight={700}>
              Belangrijk
            </Typography>
            <Typography variant="body2">
              Nadat een vonnis is geregistreerd door de deurwaarder en bevestigd
              in CFSB, wordt automatisch een economische blokkade actief. De
              status en opvolging van het dossier kunt u volgen via &quot;Mijn
              gerechtelijke dossiers&quot;.
            </Typography>
          </Alert>
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
