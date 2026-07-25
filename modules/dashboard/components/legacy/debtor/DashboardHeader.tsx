"use client";

import React from "react";
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  TextField,
  InputAdornment,
  MenuItem,
  Button,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import FilterAltOffIcon from "@mui/icons-material/FilterAltOff";
import DescriptionIcon from "@mui/icons-material/Description";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PauseCircleIcon from "@mui/icons-material/PauseCircle";
import DeleteIcon from "@mui/icons-material/Delete";
import { formatCurrency } from "@/shared/utils/formatters";
import { AttachMoney, Pause } from "@mui/icons-material";

const StatCard = ({ title, value, subtitle, icon, color, type }: any) => (
  <Card elevation={1}>
    <CardContent sx={{ bgcolor: "secondary.light" }}>
      <Box display="flex" alignItems="center" gap={2}>
        <Box
          sx={{
            backgroundColor: `${color}20`,
            borderRadius: "50%",
            p: 1.5,
            display: "flex",
          }}
        >
          {icon}
        </Box>
        <Box>
          <Typography variant="body2" color="text.secondary">
            {title}
          </Typography>
          <Typography variant="h5" fontWeight={600}>
            {type === "currency" ? formatCurrency(value) : value}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color={color}>
              {subtitle}
            </Typography>
          )}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

type TenantTypes = {
  id: string;
  name: string;
};

const DashboardHeader = ({
  total,
  count,
  totalPaid,
  hasActiveBlockade,
  tenants,
  onSearch,
  onTenantChange,
  onStatusChange,
}: {
  total: number;
  count: number;
  totalPaid: number;
  hasActiveBlockade: boolean;
  tenants: TenantTypes[];
  onSearch: (query: string) => void;
  onTenantChange: (tenantId: string) => void;
  onStatusChange: (status: string) => void;
}) => {
  return (
    <Box>
      {/* 🔹 STATS */}
      <Grid container spacing={2} mb={2}>
        <Grid size={{ xs: 12, md: 3 }}>
          <StatCard
            title="Totaal openstaand"
            value={total}
            type="currency"
            color="#1976d2"
            icon={<DescriptionIcon sx={{ color: "#1976d2" }} />}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 3 }}>
          <StatCard
            title="Totaal dossiers"
            value={count}
            color="#2e7d32"
            icon={<CheckCircleIcon sx={{ color: "#2e7d32" }} />}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 3 }}>
          <StatCard
            title="Totaal betaald"
            value={totalPaid}
            type="currency"
            color="#ed6c02"
            icon={<AttachMoney sx={{ color: "#ed6c02" }} />}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 3 }}>
          <StatCard
            title="Economische blokkade"
            value={hasActiveBlockade ? "Actief" : "Niet actief"}
            color={hasActiveBlockade ? "#d32f2f" : "#2e7d32"}
            icon={
              <Pause
                sx={{ color: hasActiveBlockade ? "#d32f2f" : "#2e7d32" }}
              />
            }
          />
        </Grid>
      </Grid>

      {/* 🔹 FILTROS */}
      <Card elevation={1} sx={{ borderRadius: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            {/* Buscar */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Typography variant="body2" mb={0.5}>
                Zoeken
              </Typography>
              <TextField
                fullWidth
                size="small"
                placeholder="Zoeken op referentie..."
                onChange={(e) => onSearch(e.target.value)}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            {/* Deelnemer */}
            <Grid size={{ xs: 12, md: 3 }}>
              <Typography variant="body2" mb={0.5}>
                Deelnemer
              </Typography>
              <TextField
                select
                fullWidth
                size="small"
                defaultValue=""
                onChange={(e) => onTenantChange(e.target.value)}
              >
                <MenuItem value="">Alles</MenuItem>
                {tenants.map((tenant: TenantTypes) => (
                  <MenuItem key={tenant.id} value={tenant.id}>
                    {tenant.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            {/* Estado */}
            <Grid size={{ xs: 12, md: 3 }}>
              <Typography variant="body2" mb={0.5}>
                Status
              </Typography>
              <TextField
                select
                fullWidth
                size="small"
                defaultValue=""
                onChange={(e) => onStatusChange(e.target.value)}
              >
                <MenuItem value="">Alles</MenuItem>
                <MenuItem value="REMINDER">Aanmaning</MenuItem>
                <MenuItem value="FINAL_NOTICE">Sommatie</MenuItem>
                <MenuItem value="DEFAULT_NOTICE">Ingebrekestelling</MenuItem>
                <MenuItem value="BLK_NOTIFICATION">Blokkade</MenuItem>
              </TextField>
            </Grid>

            {/* Botón */}
            <Grid size={{ xs: 12, md: 2 }}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<FilterAltOffIcon />}
                sx={{ mt: { xs: 1, md: 3 } }}
                color="secondary"
              >
                Filters wissen
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
};

export default DashboardHeader;
