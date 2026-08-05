"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Container,
  Typography,
  Card,
  CardContent,
  CardHeader,
  Box,
  Chip,
  Grid,
  Stack,
  Divider,
  Alert,
} from "@mui/material";

import AppBreadcrumbs from "@/shared/ui/common/AppBreadcrumbs";
import LoadingUI from "@/shared/ui/loading-ui";
import { notifyError } from "@/shared/ui/notifications";
import { formatCurrency, formatDate } from "@/shared/utils/formatters";

import { getFinancialAgreementById } from "@/modules/financial-agreement/actions/financial-agreement.actions";
import { getFinancialAgreementStatusInfo } from "@/modules/financial-agreement/utils/financial-agreement-status";

type FinancialAgreementDetail = Awaited<ReturnType<typeof getFinancialAgreementById>>;

function InfoField({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <Box>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ textTransform: "uppercase", letterSpacing: 0.4, display: "block" }}
      >
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={600}>
        {value ?? "-"}
      </Typography>
    </Box>
  );
}

const FinancialAgreementDetailPage: React.FC = () => {
  const params = useParams();

  const [loading, setLoading] = useState(true);
  const [financialAgreement, setFinancialAgreement] = useState<FinancialAgreementDetail | null>(null);

  const load = useCallback(async () => {
    if (!params.id) return;
    try {
      setLoading(true);
      const data = await getFinancialAgreementById(params.id as string);
      setFinancialAgreement(data);
    } catch (error) {
      notifyError(error instanceof Error ? error.message : "Kon FAR niet laden");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <LoadingUI />;
  if (!financialAgreement) {
    return (
      <Container sx={{ py: 4 }}>
        <Typography>FAR niet gevonden.</Typography>
      </Container>
    );
  }

  const statusInfo = getFinancialAgreementStatusInfo(financialAgreement.status);
  const debtorName = financialAgreement.debtor?.person
    ? `${financialAgreement.debtor.person.first_name ?? ""} ${financialAgreement.debtor.person.last_name ?? ""}`.trim()
    : "-";

  return (
    <Container maxWidth="md" disableGutters sx={{ px: { xs: 1, sm: 3 }, py: { xs: 1.5, sm: 4 } }}>
      <AppBreadcrumbs
        items={[
          { label: "FAR — Financiële Afspraken Registreren", href: "/financial-agreements" },
          { label: "Details" },
        ]}
      />

      <Stack spacing={3}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
          <Typography variant="h4" fontWeight={700}>
            {financialAgreement.reference || "FAR"}
          </Typography>
          <Chip label={statusInfo.label} color={statusInfo.color} sx={{ fontWeight: 700 }} />
        </Stack>

        {financialAgreement.status === "REGISTERED" && (
          <Alert severity="success">
            Este acuerdo financiero está registrado y estable. No tiene seguimiento activo ni
            recordatorios — si en el futuro hay incumplimiento, se inicia un expediente (AOP) nuevo
            con su propia tarifa, no una conversión automática de este registro.
          </Alert>
        )}

        <Card>
          <CardHeader title="Gegevens" />
          <Divider />
          <CardContent>
            <Grid container spacing={2.5}>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <InfoField label="Debiteur" value={debtorName} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <InfoField label="Bedrag" value={formatCurrency(financialAgreement.amount)} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <InfoField label="Munteenheid" value={financialAgreement.currency} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <InfoField label="Aangemaakt op" value={formatDate(financialAgreement.createdAt.toString())} />
              </Grid>
              {financialAgreement.registeredAt && (
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <InfoField
                    label="Geregistreerd op"
                    value={formatDate(financialAgreement.registeredAt.toString())}
                  />
                </Grid>
              )}
              {financialAgreement.contract && (
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <InfoField
                    label="Overeenkomst"
                    value={financialAgreement.contract.reference_number}
                  />
                </Grid>
              )}
              <Grid size={{ xs: 12 }}>
                <InfoField label="Omschrijving" value={financialAgreement.description || "-"} />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Stack>
    </Container>
  );
};

export default FinancialAgreementDetailPage;
