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
import FolderIcon from "@mui/icons-material/Folder";
import ShieldIcon from "@mui/icons-material/Shield";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import { formatCurrency } from "@/shared/utils/formatters";

const StatCard = ({
  title,
  value,
  subtitle,
  icon,
  type,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  type?: "currency" | "text";
}) => (
  <Card variant="outlined" sx={{ height: "100%", borderColor: "grey.200" }}>
    <CardContent>
      <Box display="flex" alignItems="center" gap={2}>
        <Box
          sx={{
            bgcolor: "grey.100",
            borderRadius: "50%",
            width: 44,
            height: 44,
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
  openToCfsb,
  count,
  blockadeActiveCount,
  tenants,
  onSearch,
  onTenantChange,
  onStatusChange,
  onPaymentStatusChange,
  onReset,
}: {
  total: number;
  openToCfsb: number;
  count: number;
  blockadeActiveCount: number;
  tenants: TenantTypes[];
  onSearch: (query: string) => void;
  onTenantChange: (tenantId: string) => void;
  onStatusChange: (status: string) => void;
  onPaymentStatusChange: (status: string) => void;
  onReset: () => void;
}) => {
  return (
    <Box sx={{ mt: 4 }}>
      {/* Stats */}
      <Grid container spacing={2} mb={2}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Totaal openstaand bedrag"
            value={total}
            type="currency"
            subtitle="Som van alle openstaande bedragen"
            icon={
              <DescriptionIcon
                fontSize="small"
                sx={{ color: "text.secondary" }}
              />
            }
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Totaal dossiers"
            value={count}
            subtitle="Alle geregistreerde dossiers"
            icon={
              <FolderIcon fontSize="small" sx={{ color: "text.secondary" }} />
            }
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Totaal verschuldigd aan CFSB"
            value={openToCfsb}
            type="currency"
            subtitle="Openstaande kosten aan CFSB"
            icon={
              <AttachMoneyIcon
                fontSize="small"
                sx={{ color: "text.secondary" }}
              />
            }
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card
            variant="outlined"
            sx={{
              height: "100%",
              borderColor: "warning.main",
              bgcolor: "#FFF7ED",
            }}
          >
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <Box
                  sx={{
                    bgcolor: "warning.light",
                    borderRadius: "50%",
                    width: 44,
                    height: 44,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <ShieldIcon fontSize="small" sx={{ color: "warning.dark" }} />
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Economische blokkade
                  </Typography>
                  <Typography variant="h5" fontWeight={700}>
                    {blockadeActiveCount}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Actieve blokkades
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filtros */}
      <Card variant="outlined" sx={{ borderColor: "grey.200", mt: 8 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField
                fullWidth
                size="small"
                label="Zoeken"
                placeholder="Zoeken op referentie..."
                onChange={(e) => onSearch(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" color="disabled" />
                      </InputAdornment>
                    ),
                  },
                }}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <TextField
                select
                fullWidth
                size="small"
                label="Deelnemer"
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

            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <TextField
                select
                fullWidth
                size="small"
                label="AOP-stap"
                defaultValue=""
                onChange={(e) => onStatusChange(e.target.value)}
              >
                <MenuItem value="">Alle stappen</MenuItem>
                <MenuItem value="REMINDER">Aanmaning</MenuItem>
                <MenuItem value="FINAL_NOTICE">Sommatie</MenuItem>
                <MenuItem value="DEFAULT_NOTICE">Ingebrekestelling</MenuItem>
                <MenuItem value="BLK_NOTIFICATION">Blokkade</MenuItem>
              </TextField>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                select
                fullWidth
                size="small"
                label="Status"
                defaultValue=""
                onChange={(e) => onPaymentStatusChange(e.target.value)}
              >
                <MenuItem value="">Alle dossiers</MenuItem>
                <MenuItem value="OPEN">Openstaand</MenuItem>
                <MenuItem value="CLOSED">Afgerond</MenuItem>
              </TextField>
            </Grid>

            <Grid size={{ xs: 12, md: 2 }}>
              <Button
                fullWidth
                size="small"
                variant="text"
                color="inherit"
                startIcon={<FilterAltOffIcon fontSize="small" />}
                sx={{ height: 40, color: "text.secondary" }}
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
