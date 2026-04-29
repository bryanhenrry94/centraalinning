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
import { formatCurrency } from "@/utils/formatters";
import { AttachMoney, Pause } from "@mui/icons-material";

const StatCard = ({ title, value, subtitle, icon, color, type }: any) => (
  <Card elevation={1} sx={{ borderRadius: 3 }}>
    <CardContent>
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

const DashboardHeader = ({
  total,
  count,
}: {
  total: number;
  count: number;
}) => {
  return (
    <Box>
      {/* 🔹 STATS */}
      <Grid container spacing={2} mb={2}>
        <Grid size={{ xs: 12, md: 3 }}>
          <StatCard
            title="Totale schulden"
            value={total}
            type="currency"
            color="#1976d2"
            icon={<DescriptionIcon sx={{ color: "#1976d2" }} />}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 3 }}>
          <StatCard
            title="Totaal bestanden"
            value={count}
            color="#2e7d32"
            icon={<CheckCircleIcon sx={{ color: "#2e7d32" }} />}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 3 }}>
          <StatCard
            title="Totaal betaald"
            value="0"
            type="currency"
            color="#ed6c02"
            icon={<AttachMoney sx={{ color: "#ed6c02" }} />}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 3 }}>
          <StatCard
            title="Economische Blokkade"
            value="JA / NEE"
            color="#d32f2f"
            icon={<Pause sx={{ color: "#d32f2f" }} />}
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
                Buscar referencia
              </Typography>
              <TextField
                fullWidth
                size="small"
                placeholder="Buscar por código o descripción..."
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            {/* Acreedor */}
            <Grid size={{ xs: 12, md: 3 }}>
              <Typography variant="body2" mb={0.5}>
                Acreedor
              </Typography>
              <TextField select fullWidth size="small" defaultValue="">
                <MenuItem value="">Todos los acreedores</MenuItem>
                <MenuItem value="1">Acreedor 1</MenuItem>
                <MenuItem value="2">Acreedor 2</MenuItem>
              </TextField>
            </Grid>

            {/* Estado */}
            <Grid size={{ xs: 12, md: 3 }}>
              <Typography variant="body2" mb={0.5}>
                Estado
              </Typography>
              <TextField select fullWidth size="small" defaultValue="">
                <MenuItem value="">Todos los estados</MenuItem>
                <MenuItem value="active">Activos</MenuItem>
                <MenuItem value="inactive">Inactivos</MenuItem>
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
                Limpiar filtros
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
};

export default DashboardHeader;
