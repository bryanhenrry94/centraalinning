"use client";

import { useEffect, useState } from "react";
import { Chip, Container, Stack, Typography } from "@mui/material";
import AppBreadcrumbs from "@/shared/ui/common/AppBreadcrumbs";
import LoadingUI from "@/shared/ui/loading-ui";
import { notifyError } from "@/shared/ui/notifications";
import { formatDate } from "@/shared/utils/formatters";
import { ListColumn, ResponsiveListTable } from "@/shared/ui/responsive-list-table";
import { getAdminBlockades } from "@/modules/admin/actions/admin.actions";

type Row = Awaited<ReturnType<typeof getAdminBlockades>>[number];

export default function AdminBlkRegisterPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    getAdminBlockades()
      .then(setRows)
      .catch(() => notifyError("Kon BLK-register niet laden"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingUI />;

  const columns: ListColumn<Row>[] = [
    { key: "debtorName", label: "Debiteur", render: (r) => r.debtorName },
    { key: "tenantName", label: "Deelnemer", render: (r) => r.tenantName },
    { key: "reason", label: "Reden", render: (r) => r.reason },
    {
      key: "status",
      label: "Status",
      render: (r) => (
        <Chip size="small" label={r.status} color={r.status === "ACTIVE" ? "error" : "default"} />
      ),
    },
    {
      key: "registeredAt",
      label: "Geregistreerd op",
      render: (r) => formatDate(r.registeredAt.toString()),
      hideOnMobile: true,
    },
  ];

  return (
    <Container maxWidth="lg" disableGutters sx={{ px: { xs: 1, sm: 3 }, py: { xs: 1.5, sm: 4 } }}>
      <AppBreadcrumbs items={[{ label: "CFSB Admin", href: "/admin" }, { label: "BLK-register" }]} />
      <Stack spacing={3}>
        <Typography variant="h4" fontWeight={700}>
          BLK-register
        </Typography>
        <ResponsiveListTable columns={columns} rows={rows} getRowKey={(r) => r.id} emptyMessage="Nog geen blokkades." />
      </Stack>
    </Container>
  );
}
