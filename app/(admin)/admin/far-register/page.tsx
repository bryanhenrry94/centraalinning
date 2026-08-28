"use client";

import { useEffect, useState } from "react";
import { Chip, Container, Stack, Typography } from "@mui/material";
import AppBreadcrumbs from "@/shared/ui/common/AppBreadcrumbs";
import LoadingUI from "@/shared/ui/loading-ui";
import { notifyError } from "@/shared/ui/notifications";
import { formatCurrency, formatDate } from "@/shared/utils/formatters";
import { ListColumn, ResponsiveListTable } from "@/shared/ui/responsive-list-table";
import { getAdminFinancialAgreements } from "@/modules/admin/actions/admin.actions";

type Row = Awaited<ReturnType<typeof getAdminFinancialAgreements>>[number];

export default function AdminFarRegisterPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    getAdminFinancialAgreements()
      .then(setRows)
      .catch(() => notifyError("Kon FAR-register niet laden"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingUI />;

  const columns: ListColumn<Row>[] = [
    { key: "reference", label: "Referentie", render: (r) => r.reference || "-" },
    { key: "tenantName", label: "Deelnemer", render: (r) => r.tenantName },
    { key: "debtorName", label: "Debiteur", render: (r) => r.debtorName },
    { key: "amount", label: "Bedrag", align: "right", render: (r) => formatCurrency(r.amount) },
    { key: "status", label: "Status", render: (r) => <Chip size="small" label={r.status} /> },
    { key: "createdAt", label: "Datum", render: (r) => formatDate(r.createdAt.toString()), hideOnMobile: true },
  ];

  return (
    <Container maxWidth="lg" disableGutters sx={{ px: { xs: 1, sm: 3 }, py: { xs: 1.5, sm: 4 } }}>
      <AppBreadcrumbs items={[{ label: "CFSB Admin", href: "/admin" }, { label: "FAR-register" }]} />
      <Stack spacing={3}>
        <Typography variant="h4" fontWeight={700}>
          FAR-register
        </Typography>
        <ResponsiveListTable
          columns={columns}
          rows={rows}
          getRowKey={(r) => r.id}
          emptyMessage="Nog geen FAR-registraties."
        />
      </Stack>
    </Container>
  );
}
