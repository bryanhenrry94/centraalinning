// mui
import { Box, Typography, Paper, Grid } from "@mui/material";
// hooks
import { useTenant } from "@/modules/auth/hooks/useTenant";
import { InfoField } from "@/shared/ui/info-field";

export const AccountForm = () => {
  const { tenant } = useTenant();

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

  return (
    <Box sx={{ mt: 2 }}>
      <Grid container spacing={2}>
        {/* Datos de mi cuenta */}
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
                <InfoField label="E-mailadres voor contact" value={tenant.contact_email} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <InfoField label="Telefoon" value={tenant.phone} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <InfoField label="Website" value={tenant.website} />
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
                  value={tenant.number_of_employees != null ? String(tenant.number_of_employees) : ""}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <InfoField label="Actief" value={tenant.is_active ? "Ja" : "Nee"} />
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};
