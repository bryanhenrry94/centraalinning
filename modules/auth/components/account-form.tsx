// mui
import {
  Box,
  Typography,
  Paper,
  Grid,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from "@mui/material";
// hooks
import { useTenant } from "@/modules/auth/hooks/useTenant";

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

            <TableContainer
              sx={{ mb: 2, display: "flex", justifyContent: "center" }}
            >
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: "bold" }}>
                      Configuratie
                    </TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>
                      Beschrijving
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell>Naam:</TableCell>
                    <TableCell>{tenant.name ?? ""}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Subdomein:</TableCell>
                    <TableCell>{tenant.subdomain ?? ""}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>E-mailadres voor contact:</TableCell>
                    <TableCell>{tenant.contact_email ?? ""}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Telefoon:</TableCell>
                    <TableCell>{tenant.phone ?? ""}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Website:</TableCell>
                    <TableCell>{tenant.website ?? ""}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Adres:</TableCell>
                    <TableCell>{tenant.address ?? ""}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Stad:</TableCell>
                    <TableCell>{tenant.city ?? ""}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Land (code):</TableCell>
                    <TableCell>{tenant.country_code ?? ""}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Aantal medewerkers:</TableCell>
                    <TableCell>
                      {tenant.number_of_employees != null
                        ? String(tenant.number_of_employees)
                        : ""}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Actief:</TableCell>
                    <TableCell>{tenant.is_active ? "Ja" : "Nee"}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};
