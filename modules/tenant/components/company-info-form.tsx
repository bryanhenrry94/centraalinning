"use client";

import { useEffect } from "react";
import { Box, Button, Grid, Paper, TextField, Typography } from "@mui/material";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTenant } from "@/modules/auth/hooks/useTenant";
import { InfoField } from "@/shared/ui/info-field";
import { notifyError, notifySuccess } from "@/shared/ui/notifications";
import { updateTenantCompanyInfo } from "@/modules/tenant/actions/tenant.actions";
import {
  TenantCompanyUpdate,
  TenantCompanyUpdateSchema,
} from "@/modules/tenant/services/tenant.validators";

interface CompanyInfoFormProps {
  // Solo TENANT_ADMIN (o PLATFORM_OWNER) puede editar — el resto de roles
  // con acceso a /settings sigue viendo la vista de solo lectura (ver
  // requireTenantAdminForTenant en tenant-guards.ts, que refuerza esto
  // también del lado del servidor).
  canEdit: boolean;
}

export const CompanyInfoForm = ({ canEdit }: CompanyInfoFormProps) => {
  const { tenant, loading } = useTenant();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TenantCompanyUpdate>({
    resolver: zodResolver(TenantCompanyUpdateSchema),
    defaultValues: {
      name: "",
      contact_email: "",
      phone: "",
      website: "",
      address: "",
      city: "",
      number_of_employees: undefined,
    },
  });

  useEffect(() => {
    if (!tenant) return;

    reset({
      name: tenant.name || "",
      contact_email: tenant.contact_email || "",
      phone: tenant.phone || "",
      website: tenant.website || "",
      address: tenant.address || "",
      city: tenant.city || "",
      number_of_employees: tenant.number_of_employees ?? undefined,
    });
  }, [tenant, reset]);

  const onSubmit = async (data: TenantCompanyUpdate) => {
    if (!tenant) return;

    const response = await updateTenantCompanyInfo(tenant.id, data);

    if (!response.success) {
      notifyError(response.error || "Kon bedrijfsgegevens niet bijwerken.");
      return;
    }

    notifySuccess("Bedrijfsgegevens succesvol bijgewerkt.");
  };

  if (loading) return null;

  if (!tenant) {
    return (
      <Box p={2}>
        <Typography variant="h6">Cuenta</Typography>
        <Typography color="textSecondary">
          No hay información del tenant.
        </Typography>
      </Box>
    );
  }

  if (!canEdit) {
    return (
      <Box sx={{ mt: 2 }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Mijn accountgegevens
              </Typography>

              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <InfoField label="Naam" value={tenant.name} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <InfoField label="Subdomein" value={tenant.subdomain} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <InfoField
                    label="E-mailadres voor contact"
                    value={tenant.contact_email}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <InfoField label="Telefoon" value={tenant.phone} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <InfoField label="Adres" value={tenant.address} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <InfoField label="Stad" value={tenant.city} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <InfoField label="Land (code)" value={tenant.country_code} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <InfoField
                    label="Aantal medewerkers"
                    value={
                      tenant.number_of_employees != null
                        ? String(tenant.number_of_employees)
                        : ""
                    }
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <InfoField
                    label="Actief"
                    value={tenant.is_active ? "Ja" : "Nee"}
                  />
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 2 }}>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Bedrijfsgegevens
            </Typography>

            <Box component="form" onSubmit={handleSubmit(onSubmit)}>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Controller
                    name="name"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Bedrijfsnaam"
                        size="small"
                        error={!!errors.name}
                        helperText={errors.name?.message}
                      />
                    )}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <InfoField label="Subdomein" value={tenant.subdomain} />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Controller
                    name="contact_email"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        value={field.value || ""}
                        fullWidth
                        type="email"
                        label="E-mailadres voor contact"
                        size="small"
                        error={!!errors.contact_email}
                        helperText={errors.contact_email?.message}
                      />
                    )}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Controller
                    name="phone"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        value={field.value || ""}
                        fullWidth
                        label="Telefoon"
                        size="small"
                        error={!!errors.phone}
                        helperText={errors.phone?.message}
                      />
                    )}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Controller
                    name="address"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        value={field.value || ""}
                        fullWidth
                        label="Adres"
                        size="small"
                        error={!!errors.address}
                        helperText={errors.address?.message}
                      />
                    )}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Controller
                    name="city"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        value={field.value || ""}
                        fullWidth
                        label="Stad"
                        size="small"
                        error={!!errors.city}
                        helperText={errors.city?.message}
                      />
                    )}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Controller
                    name="number_of_employees"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        fullWidth
                        type="number"
                        label="Aantal medewerkers"
                        size="small"
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === ""
                              ? undefined
                              : Number(e.target.value),
                          )
                        }
                        error={!!errors.number_of_employees}
                        helperText={errors.number_of_employees?.message}
                      />
                    )}
                  />
                </Grid>
              </Grid>

              <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 3 }}>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={isSubmitting}
                  sx={{ textTransform: "none" }}
                >
                  {isSubmitting ? "Opslaan..." : "Wijzigingen opslaan"}
                </Button>
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};
