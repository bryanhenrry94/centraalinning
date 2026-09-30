"use client";

import { useEffect, useState } from "react";
import { Chip, Container, Stack, Typography } from "@mui/material";
import AppBreadcrumbs from "@/shared/ui/common/AppBreadcrumbs";
import LoadingUI from "@/shared/ui/loading-ui";
import { notifyError } from "@/shared/ui/notifications";
import { formatCurrency } from "@/shared/utils/formatters";
import {
  ListColumn,
  ResponsiveListTable,
} from "@/shared/ui/responsive-list-table";
import { getAdminClaimCharges } from "@/modules/admin/actions/admin.actions";
import { getChargeAdminStatusInfo } from "@/modules/admin/utils/admin-status";
import { getClaimChargeConceptLabel } from "@/modules/admin/utils/admin-charge-concept";

type Row = Awaited<ReturnType<typeof getAdminClaimCharges>>[number];

export default function AdminAdministrativeFeesPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    getAdminClaimCharges()
      .then(setRows)
      .catch(() => notifyError("Kon CFSB-kosten niet laden"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingUI />;

  const columns: ListColumn<Row>[] = [
    {
      key: "reference",
      label: "Dossiernummer",
      render: (r) => r.reference || "-",
    },
    {
      key: "tenantName",
      label: "Deelnemer",
      align: "left",
      render: (r) => r.tenantName,
    },
    {
      key: "debtorName",
      label: "Debiteur",
      align: "left",
      render: (r) => r.debtorName,
    },
    {
      key: "concept",
      label: "Omschrijving",
      align: "left",
      render: (r) => getClaimChargeConceptLabel(r.concept, r.percentage),
    },
    {
      key: "service",
      label: "Dienst",
      render: (r) => r.service,
      hideOnMobile: true,
    },
    {
      key: "amount",
      label: "Bedrag",
      align: "right",
      render: (r) => formatCurrency(r.amount),
    },
    {
      key: "status",
      label: "Status",
      render: (r) => {
        const { label, color } = getChargeAdminStatusInfo(r.status);
        return (
          <Chip
            size="small"
            label={label}
            color={color}
            sx={{ minWidth: 130, justifyContent: "center" }}
          />
        );
      },
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
          { label: "CFSB-kosten" },
        ]}
      />
      <Stack spacing={3}>
        <Typography variant="h4" fontWeight={700}>
          CFSB-kosten
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Overzicht van door CFSB geregistreerde kosten per dossier.
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
