"use client";

import { useEffect, useState } from "react";
import { Chip, Container, Stack, Typography } from "@mui/material";
import AppBreadcrumbs from "@/shared/ui/common/AppBreadcrumbs";
import LoadingUI from "@/shared/ui/loading-ui";
import { notifyError } from "@/shared/ui/notifications";
import { formatDate } from "@/shared/utils/formatters";
import { ListColumn, ResponsiveListTable } from "@/shared/ui/responsive-list-table";
import { getAdminTenants } from "@/modules/admin/actions/admin.actions";

type TenantRow = Awaited<ReturnType<typeof getAdminTenants>>[number];

export default function AdminTenantsPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<TenantRow[]>([]);

  useEffect(() => {
    getAdminTenants()
      .then(setRows)
      .catch(() => notifyError("Kon deelnemers niet laden"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingUI />;

  const columns: ListColumn<TenantRow>[] = [
    { key: "name", label: "Naam", render: (r) => r.name },
    { key: "code", label: "CFSB-code", render: (r) => r.code },
    { key: "country_code", label: "Land/eiland", render: (r) => r.country_code },
    {
      key: "is_active",
      label: "Status",
      render: (r) => (
        <Chip
          size="small"
          label={r.is_active ? "Actief" : "Inactief"}
          color={r.is_active ? "success" : "default"}
        />
      ),
    },
    { key: "created_at", label: "Aangemaakt op", render: (r) => formatDate(r.created_at.toString()) },
  ];

  return (
    <Container maxWidth="lg" disableGutters sx={{ px: { xs: 1, sm: 3 }, py: { xs: 1.5, sm: 4 } }}>
      <AppBreadcrumbs items={[{ label: "CFSB Admin", href: "/admin" }, { label: "Deelnemers" }]} />
      <Stack spacing={3}>
        <Typography variant="h4" fontWeight={700}>
          Deelnemers
        </Typography>
        <ResponsiveListTable
          columns={columns}
          rows={rows}
          getRowKey={(r) => r.id}
          getRowHref={(r) => `/admin/tenants/${r.id}`}
          emptyMessage="Nog geen deelnemers geregistreerd."
        />
      </Stack>
    </Container>
  );
}
