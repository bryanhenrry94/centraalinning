"use client";

import { useEffect, useState } from "react";
import { Chip, Container, IconButton, Stack, Typography } from "@mui/material";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import AppBreadcrumbs from "@/shared/ui/common/AppBreadcrumbs";
import LoadingUI from "@/shared/ui/loading-ui";
import { notifyError } from "@/shared/ui/notifications";
import { formatDate } from "@/shared/utils/formatters";
import {
  ListColumn,
  ResponsiveListTable,
} from "@/shared/ui/responsive-list-table";
import { getAdminTenants } from "@/modules/admin/actions/admin.actions";
import { TenantDetailsDrawer } from "@/modules/tenant/components/TenantDetailsDrawer";

type TenantRow = Awaited<ReturnType<typeof getAdminTenants>>[number];

export default function AdminTenantsPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<TenantRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

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
    {
      key: "country_code",
      label: "Land/eiland",
      render: (r) => r.country_code,
    },
    {
      key: "is_active",
      label: "Status",
      render: (r) => (
        <Chip
          size="small"
          label={r.is_active ? "Actief" : "Inactief"}
          color={r.is_active ? "success" : "default"}
          sx={{ minWidth: 90, justifyContent: "center" }}
        />
      ),
    },
    {
      key: "created_at",
      label: "Aangemaakt op",
      render: (r) => formatDate(r.created_at.toString()),
      width: 140,
    },
    {
      key: "actions",
      label: "",
      align: "right",
      width: 56,
      render: (r) => (
        <Stack
          direction="row"
          spacing={0.5}
          justifyContent="flex-end"
          onClick={(e) => e.stopPropagation()}
        >
          <IconButton
            size="small"
            aria-label="Bekijken"
            onClick={() => setSelectedId(r.id)}
          >
            <VisibilityRoundedIcon fontSize="small" />
          </IconButton>
        </Stack>
      ),
    },
  ];

  return (
    <Container
      maxWidth="lg"
      disableGutters
      sx={{ px: { xs: 1, sm: 3 }, py: { xs: 1.5, sm: 4 } }}
    >
      <AppBreadcrumbs
        items={[
          { label: "CFSB Admin", href: "/admin" },
          { label: "Deelnemers" },
        ]}
      />
      <Stack spacing={3}>
        <Typography variant="h4" fontWeight={700}>
          Deelnemers
        </Typography>
        <ResponsiveListTable
          columns={columns}
          rows={rows}
          getRowKey={(r) => r.id}
          onRowClick={(r) => setSelectedId(r.id)}
          selectedRowKey={selectedId ?? undefined}
          emptyMessage="Nog geen deelnemers geregistreerd."
        />
      </Stack>

      <TenantDetailsDrawer
        open={!!selectedId}
        tenantId={selectedId}
        onClose={() => setSelectedId(null)}
      />
    </Container>
  );
}
