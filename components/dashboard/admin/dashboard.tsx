"use client";

import { getTableSummary } from "@/actions/dashboard";
import { TableSummaryResponse } from "@/services/dashboard/types";
import { formatCurrency, formatDate } from "@/utils/formatters";
import {
  Box,
  Card,
  CardContent,
  Chip,
  Grid,
  Typography,
  Button,
  Stack,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from "@mui/material";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";

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
  const { data: session } = useSession();

  const [dataTableSummary, setDataTableSummary] = useState<
    TableSummaryResponse[]
  >([]);

  const fetchDataTableSummary = useCallback(async () => {
    if (!session?.user?.tenant_id) return;

    const result = await getTableSummary(session.user?.tenant_id || "");

    setDataTableSummary(result);
  }, [session, session?.user?.tenant_id]);

  useEffect(() => {
    fetchDataTableSummary();
  }, [fetchDataTableSummary]);

  return (
    <Box p={3}>
      <Typography variant="h4" fontWeight={700}>
        Dashboard
      </Typography>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 3 }}>
          <MetricCard title="Overeenkomsten" value="125" />
        </Grid>

        <Grid size={{ xs: 12, md: 3 }}>
          <MetricCard title="Openstaand" value="18" />
        </Grid>

        <Grid size={{ xs: 12, md: 3 }}>
          <MetricCard title="Geregistreerd" value="94" />
        </Grid>

        <Grid size={{ xs: 12, md: 3 }}>
          <MetricCard title="Gefactureerd" value="13" />
        </Grid>

        <Grid size={{ xs: 12, md: 12 }}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                mb={3}
              >
                <Typography variant="h6">Laatste overeenkomst</Typography>
              </Box>

              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Modulo</TableCell>
                      <TableCell>Datum</TableCell>
                      <TableCell>Referentie</TableCell>
                      <TableCell>Naam</TableCell>
                      <TableCell align="right">Totaal</TableCell>
                      <TableCell align="center">Status</TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {dataTableSummary.map((row, index) => (
                      <TableRow
                        key={`${row.source}-${row.reference_number}-${index}`}
                        hover
                      >
                        <TableCell>
                          <Chip
                            size="small"
                            label={
                              row.source === "contract"
                                ? "Acuerdo"
                                : row.source === "collection"
                                  ? "Cobranza"
                                  : "Bloqueo"
                            }
                            variant="outlined"
                          />
                        </TableCell>

                        <TableCell>{formatDate(row.date.toString())}</TableCell>

                        <TableCell>{row.reference_number}</TableCell>

                        <TableCell>{row.name}</TableCell>

                        <TableCell align="right">
                          {new Intl.NumberFormat("es-EC", {
                            style: "currency",
                            currency: "USD",
                          }).format(row.amount)}
                        </TableCell>

                        <TableCell align="center">
                          <Chip
                            size="small"
                            label={row.status}
                            color={
                              row.status === "OPEN"
                                ? "warning"
                                : row.status === "PAID"
                                  ? "success"
                                  : "default"
                            }
                          />
                        </TableCell>
                      </TableRow>
                    ))}

                    {dataTableSummary.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} align="center">
                          <Typography color="text.secondary">
                            No existen registros
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
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
