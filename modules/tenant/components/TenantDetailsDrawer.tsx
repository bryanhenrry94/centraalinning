"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Drawer,
  Grid,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import BusinessRoundedIcon from "@mui/icons-material/BusinessRounded";
import { InfoField } from "@/shared/ui/info-field";
import { notifyError } from "@/shared/ui/notifications";
import { formatDate } from "@/shared/utils/formatters";
import { getAdminTenantById } from "@/modules/admin/actions/admin.actions";

type TenantDetail = Awaited<ReturnType<typeof getAdminTenantById>>;

interface TenantDetailsDrawerProps {
  open: boolean;
  tenantId: string | null;
  onClose: () => void;
}

// Panel lateral de solo lectura para CFSB Admin (Deelnemers) — permite ver
// los datos básicos de un deelnemer sin salir del listado, en vez de
// navegar a /admin/tenants/[id]. Esa pantalla sigue existiendo (URL
// directa), pero el flujo normal desde la tabla ya no navega.
export function TenantDetailsDrawer({ open, tenantId, onClose }: TenantDetailsDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [tenant, setTenant] = useState<TenantDetail | null>(null);

  useEffect(() => {
    if (!open || !tenantId) return;
    setLoading(true);
    setTenant(null);
    getAdminTenantById(tenantId)
      .then(setTenant)
      .catch(() => notifyError("Kon deelnemer niet laden"))
      .finally(() => setLoading(false));
  }, [open, tenantId]);

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box sx={{ width: { xs: "100vw", sm: 420 }, display: "flex", flexDirection: "column", height: "100%" }}>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" sx={{ p: 3, pb: 1 }}>
          <Box>
            <Typography variant="h5" fontWeight={700}>
              Deelnemer details
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Basisgegevens en status van de deelnemer.
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>

        <Divider />

        <Box sx={{ flex: 1, overflowY: "auto", p: 3 }}>
          {loading || !tenant ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
              <CircularProgress size={28} />
            </Box>
          ) : (
            <Stack spacing={3}>
              <Stack
                direction="row"
                alignItems="center"
                spacing={2}
                sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: 2 }}
              >
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 1.5,
                    bgcolor: "secondary.main",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <BusinessRoundedIcon />
                </Box>
                <Typography variant="h6" fontWeight={700} sx={{ flex: 1, wordBreak: "break-word" }}>
                  {tenant.name}
                </Typography>
                <Chip
                  size="small"
                  label={tenant.is_active ? "Actief" : "Inactief"}
                  color={tenant.is_active ? "success" : "default"}
                />
              </Stack>

              <Grid container spacing={2.5}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <InfoField label="CFSB-code" value={tenant.code} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <InfoField label="Subdomein" value={tenant.subdomain} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <InfoField label="Juridische naam" value={tenant.legal_name} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <InfoField label="Land/eiland" value={tenant.country_code} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <InfoField label="Contact e-mail" value={tenant.contact_email} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <InfoField label="Telefoon" value={tenant.phone} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <InfoField label="KVK" value={tenant.kvk} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <InfoField label="Status" value={tenant.is_active ? "Actief" : "Inactief"} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <InfoField label="Aangemaakt op" value={formatDate(tenant.created_at.toString())} />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <InfoField label="Adres" value={tenant.address} />
                </Grid>
              </Grid>
            </Stack>
          )}
        </Box>

        <Divider />

        <Stack direction="row" justifyContent="flex-end" sx={{ p: 2 }}>
          <Button variant="outlined" onClick={onClose}>
            Sluiten
          </Button>
        </Stack>
      </Box>
    </Drawer>
  );
}
