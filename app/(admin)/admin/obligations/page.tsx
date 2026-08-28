"use client";

import { useEffect, useState } from "react";
import { Chip, Container, Stack, Typography } from "@mui/material";
import AppBreadcrumbs from "@/shared/ui/common/AppBreadcrumbs";
import LoadingUI from "@/shared/ui/loading-ui";
import { notifyError } from "@/shared/ui/notifications";
import { formatCurrency } from "@/shared/utils/formatters";
import { ListColumn, ResponsiveListTable } from "@/shared/ui/responsive-list-table";
import { getAdminObligations } from "@/modules/admin/actions/admin.actions";

type Row = Awaited<ReturnType<typeof getAdminObligations>>[number];

export default function AdminObligationsPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    getAdminObligations()
      .then(setRows)
      .catch(() => notifyError("Kon financiële verplichtingen niet laden"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingUI />;

  const columns: ListColumn<Row>[] = [
    { key: "reference", label: "Dossier", render: (r) => r.reference || "-" },
    { key: "tenantName", label: "Deelnemer", render: (r) => r.tenantName },
    { key: "debtorName", label: "Debiteur", render: (r) => r.debtorName },
    { key: "description", label: "Omschrijving", render: (r) => r.description || r.type, hideOnMobile: true },
    { key: "beneficiary", label: "Begunstigde", render: (r) => r.beneficiary },
    { key: "balanceAmount", label: "Openstaand", align: "right", render: (r) => formatCurrency(r.balanceAmount) },
    { key: "status", label: "Status", render: (r) => <Chip size="small" label={r.status} /> },
  ];

  return (
    <Container maxWidth="lg" disableGutters sx={{ px: { xs: 1, sm: 3 }, py: { xs: 1.5, sm: 4 } }}>
      <AppBreadcrumbs items={[{ label: "CFSB Admin", href: "/admin" }, { label: "Financiële verplichtingen" }]} />
      <Stack spacing={3}>
        <Typography variant="h4" fontWeight={700}>
          Financiële verplichtingen
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Laatste 500 openstaande/afgehandelde verplichtingen, alle deelnemers.
        </Typography>
        <ResponsiveListTable
          columns={columns}
          rows={rows}
          getRowKey={(r) => r.id}
          getRowHref={(r) => `/admin/case-files/${r.debtClaimId}`}
          emptyMessage="Nog geen verplichtingen."
        />
      </Stack>
    </Container>
  );
}
