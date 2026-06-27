"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import { Button, Stack, TextField } from "@mui/material";
import { Dayjs } from "dayjs";

interface DashboardFiltersProps {
  startDate: Dayjs | null;
  endDate: Dayjs | null;

  onStartDateChange: (date: Dayjs | null) => void;
  onEndDateChange: (date: Dayjs | null) => void;

  onCreate?: () => void;

  createLabel?: string;
}

export default function DashboardFilters({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onCreate,
  createLabel = "Nuevo registro",
}: DashboardFiltersProps) {
  return (
    <Stack
      direction={{ xs: "column", md: "row" }}
      spacing={2}
      alignItems="center"
    >
      <TextField
        label="Desde"
        type="date"
        value={startDate ? startDate.format("YYYY-MM-DD") : ""}
        onChange={(e) =>
          onStartDateChange(
            e.target.value ? (require("dayjs")(e.target.value) as Dayjs) : null,
          )
        }
        size="small"
        InputLabelProps={{
          shrink: true,
        }}
      />

      <TextField
        label="Hasta"
        type="date"
        value={endDate ? endDate.format("YYYY-MM-DD") : ""}
        onChange={(e) =>
          onEndDateChange(
            e.target.value ? (require("dayjs")(e.target.value) as Dayjs) : null,
          )
        }
        size="small"
        InputLabelProps={{
          shrink: true,
        }}
      />

      <Button
        variant="contained"
        startIcon={<AddRoundedIcon />}
        onClick={onCreate}
      >
        {createLabel}
      </Button>
    </Stack>
  );
}
