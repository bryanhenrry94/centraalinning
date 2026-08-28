"use client";

import { useEffect, useState } from "react";
import { Chip, Container, Stack, Typography } from "@mui/material";
import AppBreadcrumbs from "@/shared/ui/common/AppBreadcrumbs";
import LoadingUI from "@/shared/ui/loading-ui";
import { notifyError } from "@/shared/ui/notifications";
import { formatDate } from "@/shared/utils/formatters";
import { ListColumn, ResponsiveListTable } from "@/shared/ui/responsive-list-table";
import { getAdminAdministrativeCollections } from "@/modules/admin/actions/admin.actions";

type Row = Awaited<ReturnType<typeof getAdminAdministrativeCollections>>[number];

export default function AdminAopRegisterPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    getAdminAdministrativeCollections()
      .then(setRows)
      .catch(() => notifyError("Kon AOP-register niet laden"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingUI />;

  const columns: ListColumn<Row>[] = [
    { key: "reference", label: "Referentie", render: (r) => r.reference || "-" },
    { key: "tenantName", label: "Deelnemer", render: (r) => r.tenantName },
    { key: "debtorName", label: "Debiteur", render: (r) => r.debtorName },
    { key: "status", label: "Status", render: (r) => <Chip size="small" label={r.status} /> },
    { key: "startedAt", label: "Gestart op", render: (r) => formatDate(r.startedAt.toString()), hideOnMobile: true },
  ];

  return (
    <Container maxWidth="lg" disableGutters sx={{ px: { xs: 1, sm: 3 }, py: { xs: 1.5, sm: 4 } }}>
      <AppBreadcrumbs items={[{ label: "CFSB Admin", href: "/admin" }, { label: "AOP-register" }]} />
      <Stack spacing={3}>
        <Typography variant="h4" fontWeight={700}>
          AOP-register
        </Typography>
        <ResponsiveListTable
          columns={columns}
          rows={rows}
          getRowKey={(r) => r.id}
          getRowHref={(r) => `/admin/case-files/${r.debtClaimId}`}
          emptyMessage="Nog geen AOP-dossiers."
        />
      </Stack>
    </Container>
  );
}
