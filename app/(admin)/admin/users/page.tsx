"use client";

import { useEffect, useState } from "react";
import { Chip, Container, Stack, Typography } from "@mui/material";
import AppBreadcrumbs from "@/shared/ui/common/AppBreadcrumbs";
import LoadingUI from "@/shared/ui/loading-ui";
import { notifyError } from "@/shared/ui/notifications";
import { ListColumn, ResponsiveListTable } from "@/shared/ui/responsive-list-table";
import { getAdminUsers } from "@/modules/admin/actions/admin.actions";

type Row = Awaited<ReturnType<typeof getAdminUsers>>[number];

export default function AdminUsersPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    getAdminUsers()
      .then(setRows)
      .catch(() => notifyError("Kon gebruikers niet laden"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingUI />;

  const columns: ListColumn<Row>[] = [
    { key: "fullname", label: "Naam", render: (r) => r.fullname || "-" },
    { key: "email", label: "E-mail", render: (r) => r.email },
    {
      key: "memberships",
      label: "Deelnemers & rollen",
      render: (r) => (
        <Stack spacing={0.5}>
          {r.memberships.length === 0 && "-"}
          {r.memberships.map((m) => (
            <Typography key={m.tenantId} variant="caption" display="block">
              {m.tenantName}: {m.roles.join(", ") || "-"}
            </Typography>
          ))}
        </Stack>
      ),
    },
    {
      key: "isActive",
      label: "Status",
      render: (r) => (
        <Chip size="small" label={r.isActive ? "Actief" : "Inactief"} color={r.isActive ? "success" : "default"} />
      ),
    },
  ];

  return (
    <Container maxWidth="lg" disableGutters sx={{ px: { xs: 1, sm: 3 }, py: { xs: 1.5, sm: 4 } }}>
      <AppBreadcrumbs items={[{ label: "CFSB Admin", href: "/admin" }, { label: "Gebruikers & rollen" }]} />
      <Stack spacing={3}>
        <Typography variant="h4" fontWeight={700}>
          Gebruikers & rollen
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Laatste 500 gebruikers, alle deelnemers.
        </Typography>
        <ResponsiveListTable columns={columns} rows={rows} getRowKey={(r) => r.id} emptyMessage="Nog geen gebruikers." />
      </Stack>
    </Container>
  );
}
