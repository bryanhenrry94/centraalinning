"use client";

import { useEffect, useState } from "react";
import { Box, Button, Card, CardHeader, Container, Divider, Grid, Stack, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useRouter } from "next/navigation";
import BusinessOutlined from "@mui/icons-material/BusinessOutlined";
import GroupsOutlined from "@mui/icons-material/GroupsOutlined";
import FolderOutlined from "@mui/icons-material/FolderOutlined";
import BalanceOutlined from "@mui/icons-material/BalanceOutlined";
import GavelOutlined from "@mui/icons-material/GavelOutlined";
import LockOutlined from "@mui/icons-material/LockOutlined";
import MoveToInboxOutlined from "@mui/icons-material/MoveToInboxOutlined";
import PaymentsOutlined from "@mui/icons-material/PaymentsOutlined";

import StatCard from "@/modules/dashboard/components/StatCard";
import LoadingUI from "@/shared/ui/loading-ui";
import { notifyError } from "@/shared/ui/notifications";
import { getAdminDashboardStats } from "@/modules/admin/actions/admin.actions";

type Stats = Awaited<ReturnType<typeof getAdminDashboardStats>>;

// Snelkoppelingen naar de belangrijkste registers — zelfde begeleide
// filosofie als de rest van het systeem: het dashboard is het startpunt,
// niet een doodlopend overzicht (feedback sponsor).
const QUICK_LINKS = [
  { label: "Deelnemers", href: "/admin/tenants", icon: <BusinessOutlined fontSize="small" /> },
  { label: "Personenregister", href: "/admin/persons", icon: <GroupsOutlined fontSize="small" /> },
  { label: "Alle dossiers", href: "/admin/case-files", icon: <FolderOutlined fontSize="small" /> },
  { label: "Dossieroverdrachten", href: "/admin/transfers-register", icon: <MoveToInboxOutlined fontSize="small" /> },
  { label: "GOP-register", href: "/admin/gop-register", icon: <GavelOutlined fontSize="small" /> },
  { label: "Betalingen", href: "/admin/payments", icon: <PaymentsOutlined fontSize="small" /> },
  { label: "Advocaten", href: "/admin/lawyers", icon: <BalanceOutlined fontSize="small" /> },
  { label: "BLK-register", href: "/admin/blk-register", icon: <LockOutlined fontSize="small" /> },
];

export const AdminDashboard = () => {
  const theme = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    getAdminDashboardStats()
      .then(setStats)
      .catch(() => notifyError("Kon dashboardgegevens niet laden"))
      .finally(() => setLoading(false));
  }, []);

  if (loading || !stats) return <LoadingUI />;

  return (
    <Container maxWidth="lg" disableGutters sx={{ px: { xs: 1, sm: 3 }, py: { xs: 1.5, sm: 4 } }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" fontWeight={700}>
            CFSB Admin
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Overzicht van het volledige platform, alle deelnemers.
          </Typography>
        </Box>

        <Grid container spacing={2.5}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              title="Deelnemers"
              value={stats.totalTenants}
              subtitle={`${stats.activeTenants} actief`}
              icon={<BusinessOutlined />}
              color={theme.palette.primary.main}
              href="/admin/tenants"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              title="Debiteuren"
              value={stats.totalDebtors}
              icon={<GroupsOutlined />}
              color={theme.palette.info.main}
              href="/admin/persons"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              title="Open dossiers"
              value={stats.openDossiers}
              icon={<FolderOutlined />}
              color={theme.palette.warning.main}
              href="/admin/case-files"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              title="Omzet deze maand"
              value={stats.monthRevenue}
              type="number"
              icon={<PaymentsOutlined />}
              color={theme.palette.success.main}
              href="/admin/payments"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              title="Advocaten"
              value={stats.totalLawyers}
              icon={<BalanceOutlined />}
              color={theme.palette.primary.main}
              href="/admin/lawyers"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              title="Deurwaarders"
              value={stats.totalBailiffs}
              icon={<GavelOutlined />}
              color={theme.palette.primary.main}
              href="/admin/bailiffs"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              title="Actieve blokkades"
              value={stats.activeBlockades}
              icon={<LockOutlined />}
              color={theme.palette.error.main}
              href="/admin/blk-register"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              title="Wachtende overdrachten"
              value={stats.pendingTransfers}
              icon={<MoveToInboxOutlined />}
              color={theme.palette.warning.main}
              href="/admin/transfers-register"
            />
          </Grid>
        </Grid>

        <Card>
          <CardHeader title="Snel naar" />
          <Divider />
          <Box sx={{ p: 2 }}>
            <Grid container spacing={1.5}>
              {QUICK_LINKS.map((link) => (
                <Grid key={link.href} size={{ xs: 6, sm: 4, md: 3 }}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={link.icon}
                    onClick={() => router.push(link.href)}
                    sx={{ textTransform: "none", justifyContent: "flex-start" }}
                  >
                    {link.label}
                  </Button>
                </Grid>
              ))}
            </Grid>
          </Box>
        </Card>
      </Stack>
    </Container>
  );
};
