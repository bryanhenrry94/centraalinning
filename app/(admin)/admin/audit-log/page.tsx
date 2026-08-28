"use client";

import { useEffect, useState } from "react";
import { Button, Container, Stack, Typography } from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import AppBreadcrumbs from "@/shared/ui/common/AppBreadcrumbs";
import LoadingUI from "@/shared/ui/loading-ui";
import { notifyError } from "@/shared/ui/notifications";
import { formatDateTime } from "@/shared/utils/formatters";
import { ListColumn, ResponsiveListTable } from "@/shared/ui/responsive-list-table";
import { getAdminAuditLog } from "@/modules/admin/actions/admin.actions";

type AuditResult = Awaited<ReturnType<typeof getAdminAuditLog>>;
type Row = AuditResult["items"][number];

const PAGE_SIZE = 50;

export default function AdminAuditLogPage() {
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<AuditResult | null>(null);

  useEffect(() => {
    setLoading(true);
    getAdminAuditLog(page, PAGE_SIZE)
      .then(setResult)
      .catch(() => notifyError("Kon auditlog niet laden"))
      .finally(() => setLoading(false));
  }, [page]);

  if (loading || !result) return <LoadingUI />;

  const columns: ListColumn<Row>[] = [
    { key: "createdAt", label: "Datum", render: (r) => formatDateTime(r.createdAt.toString()) },
    { key: "entityType", label: "Entiteit", render: (r) => `${r.entityType} (${r.entityId.slice(0, 8)}…)` },
    { key: "field", label: "Veld", render: (r) => r.field },
    { key: "oldValue", label: "Oude waarde", render: (r) => r.oldValue ?? "-", hideOnMobile: true },
    { key: "newValue", label: "Nieuwe waarde", render: (r) => r.newValue ?? "-" },
    {
      key: "actor",
      label: "Door",
      render: (r) => r.actorUser?.fullname || r.actorUser?.email || "Systeem",
    },
  ];

  const totalPages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));

  return (
    <Container maxWidth="lg" disableGutters sx={{ px: { xs: 1, sm: 3 }, py: { xs: 1.5, sm: 4 } }}>
      <AppBreadcrumbs items={[{ label: "CFSB Admin", href: "/admin" }, { label: "Auditlog" }]} />
      <Stack spacing={3}>
        <Typography variant="h4" fontWeight={700}>
          Auditlog
        </Typography>
        <ResponsiveListTable columns={columns} rows={result.items} getRowKey={(r) => r.id} emptyMessage="Nog geen auditlog-vermeldingen." />
        <Stack direction="row" spacing={2} alignItems="center" justifyContent="center">
          <Button
            size="small"
            startIcon={<ChevronLeftIcon />}
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Vorige
          </Button>
          <Typography variant="body2" color="text.secondary">
            Pagina {result.page} van {totalPages}
          </Typography>
          <Button
            size="small"
            endIcon={<ChevronRightIcon />}
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Volgende
          </Button>
        </Stack>
      </Stack>
    </Container>
  );
}
