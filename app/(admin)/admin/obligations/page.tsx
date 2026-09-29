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
import { getAdminObligations } from "@/modules/admin/actions/admin.actions";
import { getObligationAdminStatusInfo } from "@/modules/admin/utils/admin-status";
import {
  getObligationBeneficiaryLabel,
  getObligationTypeLabel,
} from "@/modules/collection/utils/debt-claim-status";

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
    {
      key: "reference",
      label: "Dossier",
      render: (r) => r.reference || "-",
      width: 130,
    },
    {
      key: "tenantName",
      label: "Deelnemer",
      align: "left",
      render: (r) => r.tenantName,
      width: 190,
    },
    {
      key: "debtorName",
      label: "Debiteur",
      align: "left",
      render: (r) => r.debtorName,
      width: 190,
    },
    {
      key: "description",
      label: "Omschrijving",
      align: "left",
      render: (r) => r.description || getObligationTypeLabel(r.type),
      hideOnMobile: true,
    },
    {
      key: "beneficiary",
      label: "Te betalen aan",
      align: "left",
      render: (r) => getObligationBeneficiaryLabel(r.beneficiary),
      width: 130,
    },
    {
      key: "originalAmount",
      label: "Bedrag",
      align: "right",
      render: (r) => formatCurrency(r.originalAmount),
      hideOnMobile: true,
      width: 110,
    },
    {
      key: "balanceAmount",
      label: "Openstaand bedrag",
      align: "right",
      render: (r) => formatCurrency(r.balanceAmount),
      width: 140,
    },
    {
      key: "status",
      label: "Status",
      width: 150,
      render: (r) => {
        const { label, color } = getObligationAdminStatusInfo(r.status);
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
          { label: "Financiële verplichtingen" },
        ]}
      />
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
