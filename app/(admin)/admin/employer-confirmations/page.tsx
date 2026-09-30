"use client";

import { useEffect, useState } from "react";
import { Chip, Container, Stack, Typography } from "@mui/material";
import AppBreadcrumbs from "@/shared/ui/common/AppBreadcrumbs";
import LoadingUI from "@/shared/ui/loading-ui";
import { notifyError } from "@/shared/ui/notifications";
import { formatDate } from "@/shared/utils/formatters";
import {
  ListColumn,
  ResponsiveListTable,
} from "@/shared/ui/responsive-list-table";
import { getAdminEmployerConfirmations } from "@/modules/admin/actions/admin.actions";
import { getNetworkQueryAdminStatusInfo } from "@/modules/admin/utils/admin-status";

type Row = Awaited<ReturnType<typeof getAdminEmployerConfirmations>>[number];

// COLNetworkResponse.answer komt ruw binnen als het Prisma-enum ("YES"/"NO")
// — hier vertalen voor weergave, anders lekt het Engels door in dit
// Nederlandse scherm.
function formatAnswer(answer: string | null): string {
  if (answer === "YES") return "Ja";
  if (answer === "NO") return "Nee";
  return "In afwachting";
}

export default function AdminEmployerConfirmationsPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    getAdminEmployerConfirmations()
      .then(setRows)
      .catch(() => notifyError("Kon werkgeverbevestigingen niet laden"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingUI />;

  const columns: ListColumn<Row>[] = [
    {
      key: "displayName",
      label: "Persoon",
      align: "left",
      render: (r) => r.displayName,
    },
    {
      key: "requestingTenantName",
      label: "Deelnemer (verzoeker)",
      align: "left",
      render: (r) => r.requestingTenantName,
    },
    {
      key: "debtClaimReference",
      label: "Dossier",
      render: (r) => r.debtClaimReference || "-",
    },
    {
      key: "responses",
      label: "Reacties",
      align: "left",
      render: (r) => (
        <Stack spacing={0.5}>
          {r.responses.length === 0 && "Nog geen reacties"}
          {r.responses.map((resp, i) => (
            <Typography key={i} variant="caption" display="block">
              {resp.tenantName}: {formatAnswer(resp.answer)}
            </Typography>
          ))}
        </Stack>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (r) => {
        const { label, color } = getNetworkQueryAdminStatusInfo(r.status);
        return (
          <Chip
            size="small"
            label={label}
            color={color}
            sx={{ minWidth: 150, justifyContent: "center" }}
          />
        );
      },
    },
    {
      key: "broadcastAt",
      label: "Verzonden op",
      render: (r) => formatDate(r.broadcastAt.toString()),
      hideOnMobile: true,
    },
  ];

  return (
    <Container
      maxWidth="lg"
      disableGutters
      sx={{ px: { xs: 1, sm: 3 }, py: { xs: 1.5, sm: 4 } }}
    >
      <AppBreadcrumbs
        items={[
          { label: "CFSB Admin", href: "/admin" },
          { label: "Werkgeverbevestigingen" },
        ]}
      />
      <Stack spacing={3}>
        <Typography variant="h4" fontWeight={700}>
          Werkgeverbevestigingen
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Laatste 500 netwerkvragen "is deze persoon bij u in dienst?" en de
          reacties daarop, alle deelnemers.
        </Typography>
        <ResponsiveListTable
          columns={columns}
          rows={rows}
          getRowKey={(r) => r.id}
          emptyMessage="Nog geen werkgevervragen verzonden."
        />
      </Stack>
    </Container>
  );
}
