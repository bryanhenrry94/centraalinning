"use client";

import { useEffect, useState } from "react";
import { Chip, Container, Stack, Typography } from "@mui/material";
import AppBreadcrumbs from "@/shared/ui/common/AppBreadcrumbs";
import LoadingUI from "@/shared/ui/loading-ui";
import { notifyError } from "@/shared/ui/notifications";
import { formatCurrency } from "@/shared/utils/formatters";
import { ListColumn, ResponsiveListTable } from "@/shared/ui/responsive-list-table";
import { getAdminClaimCharges } from "@/modules/admin/actions/admin.actions";

type Row = Awaited<ReturnType<typeof getAdminClaimCharges>>[number];

export default function AdminAdministrativeFeesPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    getAdminClaimCharges()
      .then(setRows)
      .catch(() => notifyError("Kon overtredingen/vergoedingen niet laden"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingUI />;

  const columns: ListColumn<Row>[] = [
    { key: "reference", label: "Dossier", render: (r) => r.reference || "-" },
    { key: "tenantName", label: "Deelnemer", render: (r) => r.tenantName },
    { key: "debtorName", label: "Debiteur", render: (r) => r.debtorName },
    { key: "concept", label: "Concept", render: (r) => r.concept },
    { key: "service", label: "Dienst", render: (r) => r.service, hideOnMobile: true },
    { key: "amount", label: "Bedrag", align: "right", render: (r) => formatCurrency(r.amount) },
    { key: "status", label: "Status", render: (r) => <Chip size="small" label={r.status} /> },
  ];

  return (
    <Container maxWidth="lg" disableGutters sx={{ px: { xs: 1, sm: 3 }, py: { xs: 1.5, sm: 4 } }}>
      <AppBreadcrumbs items={[{ label: "CFSB Admin", href: "/admin" }, { label: "Overtredingen/vergoedingen" }]} />
      <Stack spacing={3}>
        <Typography variant="h4" fontWeight={700}>
          Overtredingen/vergoedingen
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Laatste 500 door CFSB in rekening gebrachte kosten (aanmaning/sommatie zonder reactie,
          administratiekosten, etc.), alle deelnemers.
        </Typography>
        <ResponsiveListTable
          columns={columns}
          rows={rows}
          getRowKey={(r) => r.id}
          getRowHref={(r) => `/admin/case-files/${r.debtClaimId}`}
          emptyMessage="Nog geen kosten geregistreerd."
        />
      </Stack>
    </Container>
  );
}
