"use client";

import { Box, Grid, useMediaQuery, useTheme } from "@mui/material";

import DashboardHeader from "./DashboardHeader";
import DashboardFilters from "./DashboardFilters";
import DashboardStats from "./DashboardStats";
import { StatusChart } from "./StatusChart";
import { ModuleOverview } from "./ModuleOverview";
import { LatestDocumentsTable } from "./LatestDocumentsTable";
import { DashboardResponse } from "../types/dashboard.types";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";

interface DashboardContentProps {
  dashboard: DashboardResponse;
}

export default function DashboardContent({ dashboard }: DashboardContentProps) {
  const [startDate, setStartDate] = useState<dayjs.Dayjs | null>(
    dayjs().startOf("month"),
  );
  const [endDate, setEndDate] = useState<dayjs.Dayjs | null>(dayjs());
  const router = useRouter();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <Box sx={{ pt: { xs: 1.5, sm: 4 } }}>
      <DashboardHeader
        title="Dashboard"
        subtitle="Overzicht van uw overeenkomsten en activiteiten."
        actions={
          <DashboardFilters
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={(date) => setStartDate(date)}
            onEndDateChange={(date) => setEndDate(date)}
            onCreate={() => router.push("/workstation")}
            createLabel="Diensten"
          />
        }
      />

      <Box sx={{ mt: 6 }}>
        <DashboardStats stats={dashboard.stats} pendingActions={dashboard.pendingActions} />
      </Box>

      <Grid container spacing={3} mt={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <StatusChart data={dashboard.status} />
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <ModuleOverview modules={dashboard.modules} />
        </Grid>
      </Grid>

      {mounted && isDesktop && (
        <Box mt={3}>
          <LatestDocumentsTable rows={dashboard.documents} />
        </Box>
      )}
    </Box>
  );
}
