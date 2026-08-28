"use client";

import { useEffect, useState } from "react";
import { Chip, Container, Stack, Typography } from "@mui/material";
import AppBreadcrumbs from "@/shared/ui/common/AppBreadcrumbs";
import LoadingUI from "@/shared/ui/loading-ui";
import { notifyError } from "@/shared/ui/notifications";
import { formatCurrency, formatDate } from "@/shared/utils/formatters";
import { ListColumn, ResponsiveListTable } from "@/shared/ui/responsive-list-table";
import { getAdminPayments } from "@/modules/admin/actions/admin.actions";

type Row = Awaited<ReturnType<typeof getAdminPayments>>[number];

const STATUS_COLOR: Record<string, "success" | "warning" | "error" | "default"> = {
  paid: "success",
  pending: "warning",
  failed: "error",
};

export default function AdminPaymentsPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    getAdminPayments()
      .then(setRows)
      .catch(() => notifyError("Kon betalingen niet laden"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingUI />;

  const columns: ListColumn<Row>[] = [
    { key: "tenantName", label: "Deelnemer", render: (r) => r.tenantName },
    { key: "paymentType", label: "Type", render: (r) => r.paymentType },
    { key: "totalAmount", label: "Bedrag", align: "right", render: (r) => formatCurrency(r.totalAmount) },
    { key: "method", label: "Methode", render: (r) => r.method, hideOnMobile: true },
    {
      key: "status",
      label: "Status",
      render: (r) => <Chip size="small" label={r.status} color={STATUS_COLOR[r.status] ?? "default"} />,
    },
    { key: "createdAt", label: "Datum", render: (r) => formatDate(r.createdAt.toString()), hideOnMobile: true },
  ];

  return (
    <Container maxWidth="lg" disableGutters sx={{ px: { xs: 1, sm: 3 }, py: { xs: 1.5, sm: 4 } }}>
      <AppBreadcrumbs items={[{ label: "CFSB Admin", href: "/admin" }, { label: "Betalingen" }]} />
      <Stack spacing={3}>
        <Typography variant="h4" fontWeight={700}>
          Betalingen
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Laatste 500 CFSB-betalingen (Sentoo), alle deelnemers.
        </Typography>
        <ResponsiveListTable columns={columns} rows={rows} getRowKey={(r) => r.id} emptyMessage="Nog geen betalingen." />
      </Stack>
    </Container>
  );
}
