"use client";

import { useEffect, useState } from "react";
import { Chip, Container, Stack, Typography } from "@mui/material";
import AppBreadcrumbs from "@/shared/ui/common/AppBreadcrumbs";
import LoadingUI from "@/shared/ui/loading-ui";
import { notifyError } from "@/shared/ui/notifications";
import { formatDate } from "@/shared/utils/formatters";
import { ListColumn, ResponsiveListTable } from "@/shared/ui/responsive-list-table";
import { getAdminCaseTransfers } from "@/modules/admin/actions/admin.actions";

type Row = Awaited<ReturnType<typeof getAdminCaseTransfers>>[number];

export default function AdminTransfersRegisterPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    getAdminCaseTransfers()
      .then(setRows)
      .catch(() => notifyError("Kon dossieroverdrachten niet laden"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingUI />;

  const columns: ListColumn<Row>[] = [
    { key: "reference", label: "Referentie", render: (r) => r.reference || "-" },
    { key: "tenantName", label: "Deelnemer", render: (r) => r.tenantName },
    { key: "debtorName", label: "Debiteur", render: (r) => r.debtorName },
    { key: "assigneeName", label: "Toegewezen aan", render: (r) => r.assigneeName },
    { key: "status", label: "Status", render: (r) => <Chip size="small" label={r.status} /> },
    { key: "createdAt", label: "Datum", render: (r) => formatDate(r.createdAt.toString()), hideOnMobile: true },
  ];

  return (
    <Container maxWidth="lg" disableGutters sx={{ px: { xs: 1, sm: 3 }, py: { xs: 1.5, sm: 4 } }}>
      <AppBreadcrumbs items={[{ label: "CFSB Admin", href: "/admin" }, { label: "Dossieroverdrachten" }]} />
      <Stack spacing={3}>
        <Typography variant="h4" fontWeight={700}>
          Dossieroverdrachten
        </Typography>
        <ResponsiveListTable
          columns={columns}
          rows={rows}
          getRowKey={(r) => r.id}
          getRowHref={(r) => `/admin/case-files/${r.debtClaimId}`}
          emptyMessage="Nog geen dossieroverdrachten."
        />
      </Stack>
    </Container>
  );
}
