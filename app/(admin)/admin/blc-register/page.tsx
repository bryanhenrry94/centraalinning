"use client";

import { useEffect, useState } from "react";
import { Chip, Container, Stack, Typography } from "@mui/material";
import AppBreadcrumbs from "@/shared/ui/common/AppBreadcrumbs";
import LoadingUI from "@/shared/ui/loading-ui";
import { notifyError } from "@/shared/ui/notifications";
import { formatCurrency, formatDate } from "@/shared/utils/formatters";
import { ListColumn, ResponsiveListTable } from "@/shared/ui/responsive-list-table";
import { getAdminBlockChecks } from "@/modules/admin/actions/admin.actions";

type Row = Awaited<ReturnType<typeof getAdminBlockChecks>>[number];

export default function AdminBlcRegisterPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    getAdminBlockChecks()
      .then(setRows)
      .catch(() => notifyError("Kon BLC-register niet laden"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingUI />;

  const columns: ListColumn<Row>[] = [
    { key: "personName", label: "Persoon", render: (r) => r.personName },
    { key: "tenantName", label: "Deelnemer", render: (r) => r.tenantName },
    {
      key: "blockadeFound",
      label: "Resultaat",
      render: (r) => (
        <Chip
          size="small"
          label={r.blockadeFound ? "Actieve blokkade" : "Geen blokkade"}
          color={r.blockadeFound ? "error" : "success"}
        />
      ),
    },
    { key: "price", label: "Prijs", align: "right", render: (r) => formatCurrency(r.price) },
    { key: "checkedAt", label: "Datum", render: (r) => formatDate(r.checkedAt.toString()), hideOnMobile: true },
  ];

  return (
    <Container maxWidth="lg" disableGutters sx={{ px: { xs: 1, sm: 3 }, py: { xs: 1.5, sm: 4 } }}>
      <AppBreadcrumbs items={[{ label: "CFSB Admin", href: "/admin" }, { label: "BLC-register" }]} />
      <Stack spacing={3}>
        <Typography variant="h4" fontWeight={700}>
          BLC-register
        </Typography>
        <ResponsiveListTable columns={columns} rows={rows} getRowKey={(r) => r.id} emptyMessage="Nog geen BLC-controles." />
      </Stack>
    </Container>
  );
}
