"use client";

import AssignmentRoundedIcon from "@mui/icons-material/AssignmentRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import FolderRoundedIcon from "@mui/icons-material/FolderRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";

import { Grid } from "@mui/material";
import { useTheme } from "@mui/material/styles";

import StatCard from "./StatCard";
import ActionRequiredCard from "./ActionRequiredCard";
import { PendingAction } from "../types/dashboard.types";

export interface DashboardStatsData {
  total: number;
  active: number;
  completed: number;
  blocked: number;
}

interface DashboardStatsProps {
  stats: DashboardStatsData;
  pendingActions: PendingAction[];
}

export default function DashboardStats({ stats, pendingActions }: DashboardStatsProps) {
  const theme = useTheme();

  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, sm: 6, md: 4, xl: 2.4 }}>
        <StatCard
          title="Openstaande dossiers"
          value={stats.total}
          // subtitle="Totaal"
          icon={<AssignmentRoundedIcon />}
          color={theme.palette.primary.main}
          href="/documents"
        />
      </Grid>

      <Grid size={{ xs: 12, sm: 6, md: 4, xl: 2.4 }}>
        <ActionRequiredCard actions={pendingActions} />
      </Grid>

      <Grid size={{ xs: 12, sm: 6, md: 4, xl: 2.4 }}>
        <StatCard
          title="Openstaand bedrag"
          value={stats.active}
          // subtitle="Actieve dossiers"
          icon={<CheckCircleRoundedIcon />}
          color={theme.palette.success.main}
          type="number"
          href="/documents"
        />
      </Grid>

      <Grid size={{ xs: 12, sm: 6, md: 4, xl: 2.4 }}>
        <StatCard
          title="Afgeronde dossiers"
          value={stats.completed}
          // subtitle="Afgeronde dossiers"
          icon={<FolderRoundedIcon />}
          color={theme.palette.warning.main}
          href="/documents?status=completed"
        />
      </Grid>

      <Grid size={{ xs: 12, sm: 6, md: 4, xl: 2.4 }}>
        <StatCard
          title="Actieve blokkades"
          value={stats.blocked}
          // subtitle="Met blokkade"
          icon={<LockRoundedIcon />}
          color={theme.palette.error.main}
          href="/blocks"
        />
      </Grid>
    </Grid>
  );
}
