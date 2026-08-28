"use client";

import { useEffect, useState } from "react";
import { Chip, Container, Stack, Typography } from "@mui/material";
import AppBreadcrumbs from "@/shared/ui/common/AppBreadcrumbs";
import LoadingUI from "@/shared/ui/loading-ui";
import { notifyError } from "@/shared/ui/notifications";
import { formatDate } from "@/shared/utils/formatters";
import { ListColumn, ResponsiveListTable } from "@/shared/ui/responsive-list-table";
import { getAdminLegalProcesses } from "@/modules/admin/actions/admin.actions";

type Row = Awaited<ReturnType<typeof getAdminLegalProcesses>>[number];

export default function AdminGopRegisterPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    getAdminLegalProcesses()
      .then(setRows)
      .catch(() => notifyError("Kon GOP-register niet laden"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingUI />;

  const columns: ListColumn<Row>[] = [
    { key: "referenceNumber", label: "GOP-referentie", render: (r) => r.referenceNumber || "-" },
    { key: "tenantName", label: "Deelnemer", render: (r) => r.tenantName },
    { key: "debtorName", label: "Debiteur", render: (r) => r.debtorName },
    { key: "bailiffName", label: "Deurwaarder", render: (r) => r.bailiffName },
    { key: "status", label: "Status", render: (r) => <Chip size="small" label={r.status} /> },
    { key: "startedAt", label: "Gestart op", render: (r) => formatDate(r.startedAt.toString()), hideOnMobile: true },
  ];

  return (
    <Container maxWidth="lg" disableGutters sx={{ px: { xs: 1, sm: 3 }, py: { xs: 1.5, sm: 4 } }}>
      <AppBreadcrumbs items={[{ label: "CFSB Admin", href: "/admin" }, { label: "GOP-register" }]} />
      <Stack spacing={3}>
        <Typography variant="h4" fontWeight={700}>
          GOP-register
        </Typography>
        <ResponsiveListTable
          columns={columns}
          rows={rows}
          getRowKey={(r) => r.id}
          getRowHref={(r) => `/admin/case-files/${r.debtClaimId}`}
          emptyMessage="Nog geen GOP-dossiers."
        />
      </Stack>
    </Container>
  );
}
