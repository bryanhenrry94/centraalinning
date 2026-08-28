"use client";

import { useEffect, useState } from "react";
import { Chip, Container, Stack, Typography } from "@mui/material";
import AppBreadcrumbs from "@/shared/ui/common/AppBreadcrumbs";
import LoadingUI from "@/shared/ui/loading-ui";
import { notifyError } from "@/shared/ui/notifications";
import { formatCurrency, formatDate } from "@/shared/utils/formatters";
import { ListColumn, ResponsiveListTable } from "@/shared/ui/responsive-list-table";
import { getAdminDebtClaims } from "@/modules/admin/actions/admin.actions";

type ClaimRow = Awaited<ReturnType<typeof getAdminDebtClaims>>[number];

export default function AdminCaseFilesPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ClaimRow[]>([]);

  useEffect(() => {
    getAdminDebtClaims()
      .then(setRows)
      .catch(() => notifyError("Kon dossiers niet laden"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingUI />;

  const columns: ListColumn<ClaimRow>[] = [
    { key: "reference", label: "Referentie", render: (r) => r.reference || "-" },
    { key: "tenantName", label: "Deelnemer", render: (r) => r.tenantName },
    { key: "debtorName", label: "Debiteur", render: (r) => r.debtorName },
    { key: "principalAmount", label: "Bedrag", align: "right", render: (r) => formatCurrency(r.principalAmount) },
    { key: "status", label: "Status", render: (r) => <Chip size="small" label={r.status} /> },
    { key: "createdAt", label: "Gestart op", render: (r) => formatDate(r.createdAt.toString()), hideOnMobile: true },
  ];

  return (
    <Container maxWidth="lg" disableGutters sx={{ px: { xs: 1, sm: 3 }, py: { xs: 1.5, sm: 4 } }}>
      <AppBreadcrumbs items={[{ label: "CFSB Admin", href: "/admin" }, { label: "Alle dossiers" }]} />
      <Stack spacing={3}>
        <Typography variant="h4" fontWeight={700}>
          Alle dossiers
        </Typography>
        <ResponsiveListTable
          columns={columns}
          rows={rows}
          getRowKey={(r) => r.id}
          getRowHref={(r) => `/admin/case-files/${r.id}`}
          emptyMessage="Nog geen dossiers geregistreerd."
        />
      </Stack>
    </Container>
  );
}
