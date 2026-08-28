"use client";

import { useEffect, useState } from "react";
import { Chip, Container, Stack, Typography } from "@mui/material";
import AppBreadcrumbs from "@/shared/ui/common/AppBreadcrumbs";
import LoadingUI from "@/shared/ui/loading-ui";
import { notifyError } from "@/shared/ui/notifications";
import { ListColumn, ResponsiveListTable } from "@/shared/ui/responsive-list-table";
import { getAdminBailiffs } from "@/modules/admin/actions/admin.actions";

type BailiffRow = Awaited<ReturnType<typeof getAdminBailiffs>>[number];

export default function AdminBailiffsPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<BailiffRow[]>([]);

  useEffect(() => {
    getAdminBailiffs()
      .then(setRows)
      .catch(() => notifyError("Kon deurwaarders niet laden"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingUI />;

  const columns: ListColumn<BailiffRow>[] = [
    { key: "fullname", label: "Naam", render: (r) => r.fullname },
    { key: "email", label: "E-mail", render: (r) => r.email },
    { key: "phone", label: "Telefoon", render: (r) => r.phone || "-" },
    {
      key: "status",
      label: "Status",
      render: (r) => (
        <Chip size="small" label={r.status ?? "-"} color={r.status === "ACTIVE" ? "success" : "default"} />
      ),
    },
  ];

  return (
    <Container maxWidth="lg" disableGutters sx={{ px: { xs: 1, sm: 3 }, py: { xs: 1.5, sm: 4 } }}>
      <AppBreadcrumbs items={[{ label: "CFSB Admin", href: "/admin" }, { label: "Deurwaarders" }]} />
      <Stack spacing={3}>
        <Typography variant="h4" fontWeight={700}>
          Deurwaarders
        </Typography>
        <ResponsiveListTable
          columns={columns}
          rows={rows}
          getRowKey={(r) => r.id}
          getRowHref={(r) => `/admin/bailiffs/${r.id}`}
          emptyMessage="Nog geen deurwaarders geregistreerd."
        />
      </Stack>
    </Container>
  );
}
