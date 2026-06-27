"use client";

import { Box, Grid } from "@mui/material";

import DashboardHeader from "./DashboardHeader";
import DashboardFilters from "./DashboardFilters";
import DashboardStats from "./DashboardStats";
import { StatusChart } from "./StatusChart";
import { ModuleOverview } from "./ModuleOverview";
import { LatestDocumentsTable } from "./LatestDocumentsTable";
import { DashboardResponse } from "../types/dashboard.types";
import { useState } from "react";
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

  return (
    <Box>
      <DashboardHeader
        title="Dashboard"
        subtitle="Resumen general"
        actions={
          <DashboardFilters
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={(date) => setStartDate(date)}
            onEndDateChange={(date) => setEndDate(date)}
            onCreate={() => router.push("/collections")}
            createLabel="Nueva factura"
          />
        }
      />

      <DashboardStats stats={dashboard.stats} />

      <Grid container spacing={3} mt={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <StatusChart data={dashboard.status} />
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <ModuleOverview modules={dashboard.modules} />
        </Grid>
      </Grid>

      <Box mt={3}>
        <LatestDocumentsTable rows={dashboard.documents} />
      </Box>
    </Box>
  );
}
