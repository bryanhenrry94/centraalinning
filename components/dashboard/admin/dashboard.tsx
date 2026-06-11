"use client";

import {
  Box,
  Card,
  CardContent,
  Chip,
  Grid,
  Typography,
  Button,
  Stack,
} from "@mui/material";

const contracts = [
  {
    id: 1,
    reference: "REF-2026-001",
    debtor: "Generali",
    amount: 450,
    status: "REGISTERED",
  },
  {
    id: 2,
    reference: "REF-2026-002",
    debtor: "Allianz",
    amount: 250,
    status: "DRAFT",
  },
  {
    id: 3,
    reference: "REF-2026-003",
    debtor: "AON",
    amount: 800,
    status: "PAID",
  },
  {
    id: 4,
    reference: "REF-2026-004",
    debtor: "NN Group",
    amount: 175,
    status: "REGISTERED",
  },
  {
    id: 5,
    reference: "REF-2026-005",
    debtor: "Zurich",
    amount: 320,
    status: "PAID",
  },
];

export const DashboardAdmin = () => {
  return (
    <Box p={3}>
      <Typography variant="h4" fontWeight={700}>
        Dashboard
      </Typography>

      <Typography color="text.secondary" mb={3}>
        Bienvenido Bryan
      </Typography>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 3 }}>
          <MetricCard title="Contratos" value="125" />
        </Grid>

        <Grid size={{ xs: 12, md: 3 }}>
          <MetricCard title="Pendientes" value="18" />
        </Grid>

        <Grid size={{ xs: 12, md: 3 }}>
          <MetricCard title="Registrados" value="94" />
        </Grid>

        <Grid size={{ xs: 12, md: 3 }}>
          <MetricCard title="Facturados" value="13" />
        </Grid>

        <Grid size={{ xs: 12, md: 8 }}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" mb={3}>
                <Typography variant="h6">Últimos Contratos</Typography>

                <Button variant="text">Ver más</Button>
              </Box>

              <Stack spacing={2}>
                {contracts.map((contract) => (
                  <Card key={contract.id} variant="outlined">
                    <CardContent>
                      <Box
                        display="flex"
                        justifyContent="space-between"
                        alignItems="center"
                      >
                        <Box>
                          <Typography fontWeight={600}>
                            {contract.reference}
                          </Typography>

                          <Typography variant="body2" color="text.secondary">
                            {contract.debtor}
                          </Typography>
                        </Box>

                        <Box textAlign="right">
                          <Chip label={contract.status} size="small" />

                          <Typography mt={1}>${contract.amount}</Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Typography variant="h6" mb={2}>
                Estado de contratos
              </Typography>

              <Box
                height={350}
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                Aquí irá tu gráfico
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" mb={2}>
                Actividad reciente
              </Typography>

              <Stack spacing={1}>
                <Typography>• Contrato REF-2026-001 registrado</Typography>

                <Typography>• Factura INV-2026-045 pagada</Typography>

                <Typography>• Contrato REF-2026-002 creado</Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid> */}
      </Grid>
    </Box>
  );
};

function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardContent>
        <Typography color="text.secondary">{title}</Typography>

        <Typography variant="h4" fontWeight={700}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
}
