"use client";

import { getTableSummary } from "@/modules/dashboard/actions/dashboard.actions";
import { TableSummaryResponse } from "@/modules/dashboard/types/report.types";
import { formatCurrency, formatDate } from "@/shared/utils/formatters";
import { Box, Card, CardContent, Chip, Grid, Typography } from "@mui/material";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { ListColumn, ResponsiveListTable } from "@/shared/ui/responsive-list-table";

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


              {(() => {
                const columns: ListColumn<TableSummaryResponse>[] = [
                  {
                    key: "source",
                    label: "Modulo",
                    render: (row) => (
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
                    ),
                  },
                  { key: "date", label: "Datum", render: (row) => formatDate(row.date.toString()) },
                  { key: "reference_number", label: "Referentie", render: (row) => row.reference_number },
                  { key: "name", label: "Naam", render: (row) => row.name },
                  {
                    key: "amount",
                    label: "Totaal",
                    align: "right",
                    render: (row) =>
                      new Intl.NumberFormat("es-EC", {
                        style: "currency",
                        currency: "USD",
                      }).format(row.amount),
                  },
                  {
                    key: "status",
                    label: "Status",
                    align: "center",
                    render: (row) => (
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
                    ),
                  },
                ];

                const rows = dataTableSummary.map((row, index) => ({
                  ...row,
                  _key: `${row.source}-${row.reference_number}-${index}`,
                }));

                return (
                  <ResponsiveListTable
                    columns={columns}
                    rows={rows}
                    getRowKey={(row) => row._key}
                    emptyMessage="No existen registros"
                  />
                );
              })()}
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
