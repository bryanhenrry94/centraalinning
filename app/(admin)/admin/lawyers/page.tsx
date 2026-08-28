"use client";

import { useEffect, useState } from "react";
import { Chip, Container, Stack, Typography } from "@mui/material";
import AppBreadcrumbs from "@/shared/ui/common/AppBreadcrumbs";
import LoadingUI from "@/shared/ui/loading-ui";
import { notifyError } from "@/shared/ui/notifications";
import { ListColumn, ResponsiveListTable } from "@/shared/ui/responsive-list-table";
import { getAdminLawyers } from "@/modules/admin/actions/admin.actions";

type LawyerRow = Awaited<ReturnType<typeof getAdminLawyers>>[number];

export default function AdminLawyersPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<LawyerRow[]>([]);

  useEffect(() => {
    getAdminLawyers()
      .then(setRows)
      .catch(() => notifyError("Kon advocaten niet laden"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingUI />;

  const columns: ListColumn<LawyerRow>[] = [
    { key: "name", label: "Naam", render: (r) => `${r.firstName} ${r.lastName}` },
    { key: "companyName", label: "Kantoor", render: (r) => r.companyName || "-" },
    { key: "email", label: "E-mail", render: (r) => r.email },
    {
      key: "status",
      label: "Status",
      render: (r) => (
        <Chip size="small" label={r.status} color={r.status === "ACTIVE" ? "success" : "default"} />
      ),
    },
  ];

  return (
    <Container maxWidth="lg" disableGutters sx={{ px: { xs: 1, sm: 3 }, py: { xs: 1.5, sm: 4 } }}>
      <AppBreadcrumbs items={[{ label: "CFSB Admin", href: "/admin" }, { label: "Advocaten" }]} />
      <Stack spacing={3}>
        <Typography variant="h4" fontWeight={700}>
          Advocaten
        </Typography>
        <ResponsiveListTable
          columns={columns}
          rows={rows}
          getRowKey={(r) => r.id}
          getRowHref={(r) => `/admin/lawyers/${r.id}`}
          emptyMessage="Nog geen advocaten geregistreerd."
        />
      </Stack>
    </Container>
  );
}
