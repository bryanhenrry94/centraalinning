"use client";

import { useEffect, useState } from "react";
import { Chip, Container, Stack, Typography } from "@mui/material";
import AppBreadcrumbs from "@/shared/ui/common/AppBreadcrumbs";
import LoadingUI from "@/shared/ui/loading-ui";
import { notifyError } from "@/shared/ui/notifications";
import { formatDate } from "@/shared/utils/formatters";
import { ListColumn, ResponsiveListTable } from "@/shared/ui/responsive-list-table";
import { getAdminCollectiveCollections } from "@/modules/admin/actions/admin.actions";

type Row = Awaited<ReturnType<typeof getAdminCollectiveCollections>>[number];

export default function AdminCopRegisterPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    getAdminCollectiveCollections()
      .then(setRows)
      .catch(() => notifyError("Kon COP-register niet laden"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingUI />;

  const columns: ListColumn<Row>[] = [
    { key: "reference", label: "Referentie", render: (r) => r.reference || "-" },
    { key: "tenantName", label: "Deelnemer", render: (r) => r.tenantName },
    { key: "debtorName", label: "Debiteur", render: (r) => r.debtorName },
    { key: "employerTenantName", label: "Werkgever", render: (r) => r.employerTenantName ?? "-" },
    { key: "status", label: "Status", render: (r) => <Chip size="small" label={r.status} /> },
    { key: "startedAt", label: "Gestart op", render: (r) => formatDate(r.startedAt.toString()), hideOnMobile: true },
  ];

  return (
    <Container maxWidth="lg" disableGutters sx={{ px: { xs: 1, sm: 3 }, py: { xs: 1.5, sm: 4 } }}>
      <AppBreadcrumbs items={[{ label: "CFSB Admin", href: "/admin" }, { label: "COP-register" }]} />
      <Stack spacing={3}>
        <Typography variant="h4" fontWeight={700}>
          COP-register
        </Typography>
        <ResponsiveListTable
          columns={columns}
          rows={rows}
          getRowKey={(r) => r.id}
          getRowHref={(r) => `/admin/case-files/${r.debtClaimId}`}
          emptyMessage="Nog geen COP-dossiers."
        />
      </Stack>
    </Container>
  );
}
