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
  Stack,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import FilterAltOffIcon from "@mui/icons-material/FilterAltOff";
import DescriptionIcon from "@mui/icons-material/Description";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ShieldIcon from "@mui/icons-material/Shield";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import { formatCurrency } from "@/shared/utils/formatters";

const StatCard = ({
  title,
  value,
  subtitle,
  icon,
  color,
  bgColor,
  type,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  type?: "currency" | "text";
}) => (
  <Card elevation={0} sx={{ borderRadius: 3, bgcolor: bgColor, height: "100%" }}>
    <CardContent>
      <Box display="flex" alignItems="center" gap={2}>
        <Box
          sx={{
            backgroundColor: color,
            borderRadius: "50%",
            width: 48,
            height: 48,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {icon}
        </Box>
        <Box>
          <Typography variant="body2" color="text.secondary">
            {title}
          </Typography>
          <Typography variant="h5" fontWeight={700}>
            {type === "currency" ? formatCurrency(Number(value)) : value}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary">
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
  activeCount,
  totalPaid,
  paidCount,
  blockadeActiveCount,
  blockadeInactiveCount,
  tenants,
  onSearch,
  onTenantChange,
  onStatusChange,
  onReset,
}: {
  total: number;
  count: number;
  activeCount: number;
  totalPaid: number;
  paidCount: number;
  blockadeActiveCount: number;
  blockadeInactiveCount: number;
  tenants: TenantTypes[];
  onSearch: (query: string) => void;
  onTenantChange: (tenantId: string) => void;
  onStatusChange: (status: string) => void;
  onReset: () => void;
}) => {
  return (
    <Box>
      {/* 🔹 STATS */}
      <Grid container spacing={2} mb={2}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Totaal openstaand"
            value={total}
            type="currency"
            subtitle={`${count} dossiers`}
            color="#1976d2"
            bgColor="#e8f1fb"
            icon={<DescriptionIcon sx={{ color: "#fff" }} fontSize="small" />}
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Totaal dossiers"
            value={count}
            subtitle={`${activeCount} actief`}
            color="#2e7d32"
            bgColor="#e9f6ec"
            icon={<CheckCircleIcon sx={{ color: "#fff" }} fontSize="small" />}
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Totaal betaald"
            value={totalPaid}
            type="currency"
            subtitle={`${paidCount} dossiers`}
            color="#ed6c02"
            bgColor="#fdf1e6"
            icon={<AttachMoneyIcon sx={{ color: "#fff" }} fontSize="small" />}
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card elevation={0} sx={{ borderRadius: 3, bgcolor: "#f2edfb", height: "100%" }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <Box
                  sx={{
                    backgroundColor: "#7b3fe4",
                    borderRadius: "50%",
                    width: 48,
                    height: 48,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <ShieldIcon sx={{ color: "#fff" }} fontSize="small" />
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Economische blokkade
                  </Typography>
                  <Stack spacing={0.3} mt={0.5}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          bgcolor: "#2e7d32",
                        }}
                      />
                      <Typography variant="body2" fontWeight={600}>
                        Actief
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {blockadeActiveCount}
                      </Typography>
                    </Stack>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          bgcolor: "grey.400",
                        }}
                      />
                      <Typography variant="body2" fontWeight={600}>
                        Niet actief
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {blockadeInactiveCount}
                      </Typography>
                    </Stack>
                  </Stack>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 🔹 FILTROS */}
      <Card elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "grey.200" }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            {/* Buscar */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Typography variant="body2" fontWeight={600} mb={0.5}>
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
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            {/* Deelnemer */}
            <Grid size={{ xs: 12, md: 3 }}>
              <Typography variant="body2" fontWeight={600} mb={0.5}>
                Deelnemer
              </Typography>
              <TextField
                select
                fullWidth
                size="small"
                defaultValue=""
                onChange={(e) => onTenantChange(e.target.value)}
              >
                <MenuItem value="">Alle deelnemers</MenuItem>
                {tenants.map((tenant: TenantTypes) => (
                  <MenuItem key={tenant.id} value={tenant.id}>
                    {tenant.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            {/* Estado */}
            <Grid size={{ xs: 12, md: 3 }}>
              <Typography variant="body2" fontWeight={600} mb={0.5}>
                Status
              </Typography>
              <TextField
                select
                fullWidth
                size="small"
                defaultValue=""
                onChange={(e) => onStatusChange(e.target.value)}
              >
                <MenuItem value="">Alle statussen</MenuItem>
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
                color="primary"
                onClick={onReset}
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
