"use client";

import { useEffect, useState } from "react";
import { Container, Stack, Typography } from "@mui/material";
import AppBreadcrumbs from "@/shared/ui/common/AppBreadcrumbs";
import LoadingUI from "@/shared/ui/loading-ui";
import { notifyError } from "@/shared/ui/notifications";
import { formatCurrency } from "@/shared/utils/formatters";
import { ListColumn, ResponsiveListTable } from "@/shared/ui/responsive-list-table";
import { getAdminPlans } from "@/modules/admin/actions/admin.actions";

type Row = Awaited<ReturnType<typeof getAdminPlans>>[number];

export default function AdminPlansPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    getAdminPlans()
      .then(setRows)
      .catch(() => notifyError("Kon plannen niet laden"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingUI />;

  const columns: ListColumn<Row>[] = [
    { key: "name", label: "Naam", render: (r) => r.name },
    {
      key: "registration_price",
      label: "Registratie",
      align: "right",
      render: (r) => formatCurrency(r.registration_price),
    },
    { key: "monthly_price", label: "Maandelijks", align: "right", render: (r) => formatCurrency(r.monthly_price) },
    { key: "yearly_price", label: "Jaarlijks", align: "right", render: (r) => formatCurrency(r.yearly_price) },
    {
      key: "reactivation_price",
      label: "Reactivering",
      align: "right",
      render: (r) => formatCurrency(r.reactivation_price),
      hideOnMobile: true,
    },
  ];

  return (
    <Container maxWidth="lg" disableGutters sx={{ px: { xs: 1, sm: 3 }, py: { xs: 1.5, sm: 4 } }}>
      <AppBreadcrumbs items={[{ label: "CFSB Admin", href: "/admin" }, { label: "Plannen" }]} />
      <Stack spacing={3}>
        <Typography variant="h4" fontWeight={700}>
          Plannen
        </Typography>
        <ResponsiveListTable
          columns={columns}
          rows={rows}
          getRowKey={(r) => r.id}
          getRowHref={(r) => `/admin/plans/${r.id}`}
          emptyMessage="Nog geen plannen geregistreerd."
        />
      </Stack>
    </Container>
  );
}
