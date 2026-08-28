"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Container, Typography, Chip, Button, Stack, Box } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";

import AppBreadcrumbs from "@/shared/ui/common/AppBreadcrumbs";
import LoadingUI from "@/shared/ui/loading-ui";
import { notifyError } from "@/shared/ui/notifications";
import { formatCurrency, formatDate } from "@/shared/utils/formatters";
import { ListColumn, ResponsiveListTable } from "@/shared/ui/responsive-list-table";

import { getAllFinancialAgreementsForTenant } from "@/modules/financial-agreement/actions/financial-agreement.actions";
import { getFinancialAgreementStatusInfo } from "@/modules/financial-agreement/utils/financial-agreement-status";

type FinancialAgreementListItem = Awaited<
  ReturnType<typeof getAllFinancialAgreementsForTenant>
>[number];

const FinancialAgreementsPage: React.FC = () => {
  const router = useRouter();
  const { data: session } = useSession();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<FinancialAgreementListItem[]>([]);

  const load = useCallback(async () => {
    if (!session?.user?.tenant_id) return;
    try {
      setLoading(true);
      const data = await getAllFinancialAgreementsForTenant(session.user.tenant_id);
      setItems(data);
    } catch (error) {
      notifyError(error instanceof Error ? error.message : "Kon FAR-overzicht niet laden");
    } finally {
      setLoading(false);
    }
  }, [session?.user?.tenant_id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <LoadingUI />;

  return (
    <Container maxWidth="lg" disableGutters sx={{ px: { xs: 1, sm: 3 }, py: { xs: 1.5, sm: 4 } }}>
      <AppBreadcrumbs items={[{ label: "FAR — Financiële Afspraken Registreren" }]} />

      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} gap={1} flexWrap="wrap">
        <Box>
          <Typography variant="h4" fontWeight={700}>
            FAR — Financiële Afspraken Registreren
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Servicio independiente: registro + tarifa fija. Sin seguimiento ni recordatorios.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => router.push("/financial-agreements/new")}
        >
          Nieuwe FAR registreren
        </Button>
      </Stack>

      {(() => {
        const columns: ListColumn<FinancialAgreementListItem>[] = [
          { key: "reference", label: "Referentie", render: (item) => item.reference ?? "-" },
          {
            key: "debtor",
            label: "Debiteur",
            render: (item) =>
              item.debtor?.person
                ? `${item.debtor.person.first_name ?? ""} ${item.debtor.person.last_name ?? ""}`.trim()
                : "-",
          },
          { key: "amount", label: "Bedrag", align: "right", render: (item) => formatCurrency(item.amount) },
          {
            key: "status",
            label: "Status",
            render: (item) => {
              const statusInfo = getFinancialAgreementStatusInfo(item.status);
              return <Chip label={statusInfo.label} color={statusInfo.color} size="small" sx={{ fontWeight: 700 }} />;
            },
          },
          {
            key: "createdAt",
            label: "Aangemaakt",
            render: (item) => formatDate(item.createdAt.toString()),
            hideOnMobile: true,
          },
        ];

        return (
          <ResponsiveListTable
            columns={columns}
            rows={items}
            getRowKey={(item) => item.id}
            getRowHref={(item) => `/financial-agreements/${item.id}`}
            emptyMessage="Nog geen financiële afspraken geregistreerd."
          />
        );
      })()}
    </Container>
  );
};

export default FinancialAgreementsPage;
