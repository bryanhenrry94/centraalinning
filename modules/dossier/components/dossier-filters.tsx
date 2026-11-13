"use client";

import {
  Divider,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
} from "@mui/material";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { DossierServiceType } from "@/modules/dossier/types/dossier.types";

const SERVICE_TYPE_LABELS: Record<Exclude<DossierServiceType, "BLC">, string> = {
  FAR: "FAR",
  AOP: "AOP",
  BLK: "BLK",
  COP: "COP",
  GOP: "GOP",
};

export interface DossierFiltersValue {
  search: string;
  serviceType: DossierServiceType | "ALL";
  statusLabel: string;
  dateFrom: string;
  dateTo: string;
}

interface DossierFiltersProps {
  value: DossierFiltersValue;
  onChange: (value: DossierFiltersValue) => void;
  statusOptions: string[];
}

export const DossierFilters = ({
  value,
  onChange,
  statusOptions,
}: DossierFiltersProps) => {
  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={3}
      alignItems={{ sm: "center" }}
      sx={{ width: "100%" }}
    >
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.5}
        sx={{ flex: 3, width: "100%" }}
      >
        <TextField
          size="small"
          placeholder="Zoeken op referentie, debiteur of omschrijving..."
          value={value.search}
          onChange={(e) => onChange({ ...value, search: e.target.value })}
          sx={{ flex: 2, minWidth: { sm: 240 } }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
            },
          }}
        />
        <TextField
          select
          size="small"
          value={value.serviceType}
          onChange={(e) =>
            onChange({
              ...value,
              serviceType: e.target.value as DossierServiceType | "ALL",
            })
          }
          sx={{ flex: 1, minWidth: { sm: 160 } }}
        >
          <MenuItem value="ALL">Alle diensten</MenuItem>
          {Object.entries(SERVICE_TYPE_LABELS).map(([type, label]) => (
            <MenuItem key={type} value={type}>
              {label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          value={value.statusLabel}
          onChange={(e) => onChange({ ...value, statusLabel: e.target.value })}
          sx={{ flex: 1, minWidth: { sm: 180 } }}
        >
          <MenuItem value="ALL">Alle statussen</MenuItem>
          {statusOptions.map((status) => (
            <MenuItem key={status} value={status}>
              {status}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      <Divider
        orientation="vertical"
        flexItem
        sx={{ display: { xs: "none", sm: "block" } }}
      />

      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.5}
        sx={{ flex: 2, width: "100%" }}
      >
        <TextField
          type="date"
          size="small"
          label="Van datum"
          value={value.dateFrom}
          onChange={(e) => onChange({ ...value, dateFrom: e.target.value })}
          sx={{ flex: 1, minWidth: { sm: 160 } }}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          type="date"
          size="small"
          label="Tot datum"
          value={value.dateTo}
          onChange={(e) => onChange({ ...value, dateTo: e.target.value })}
          sx={{ flex: 1, minWidth: { sm: 160 } }}
          slotProps={{ inputLabel: { shrink: true } }}
        />
      </Stack>
    </Stack>
  );
};
