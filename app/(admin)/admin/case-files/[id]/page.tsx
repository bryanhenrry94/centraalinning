"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, Chip, Container, Grid, Stack, Typography } from "@mui/material";
import AppBreadcrumbs from "@/shared/ui/common/AppBreadcrumbs";
import LoadingUI from "@/shared/ui/loading-ui";
import { notifyError } from "@/shared/ui/notifications";
import { formatCurrency, formatDate } from "@/shared/utils/formatters";
import { InfoField } from "@/shared/ui/info-field";
import { getAdminDebtClaimById } from "@/modules/admin/actions/admin.actions";

type ClaimDetail = Awaited<ReturnType<typeof getAdminDebtClaimById>>;

export default function AdminCaseFileDetailPage() {
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [claim, setClaim] = useState<ClaimDetail | null>(null);

  useEffect(() => {
    getAdminDebtClaimById(params.id as string)
      .then(setClaim)
      .catch(() => notifyError("Kon dossier niet laden"))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) return <LoadingUI />;
  if (!claim) {
    return (
      <Container sx={{ py: 4 }}>
        <Typography>Dossier niet gevonden.</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" disableGutters sx={{ px: { xs: 1, sm: 3 }, py: { xs: 1.5, sm: 4 } }}>
      <AppBreadcrumbs
        items={[
          { label: "CFSB Admin", href: "/admin" },
          { label: "Alle dossiers", href: "/admin/case-files" },
          { label: claim.reference || claim.id },
        ]}
      />
      <Stack spacing={3}>
        <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap">
          <Typography variant="h4" fontWeight={700}>
            {claim.reference || "Dossier"}
          </Typography>
          <Chip size="small" label={claim.status} />
        </Stack>
        <Card>
          <CardContent>
            <Grid container spacing={2.5}>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <InfoField label="Deelnemer" value={claim.tenantName} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <InfoField label="Debiteur" value={claim.debtorName} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <InfoField label="E-mail debiteur" value={claim.debtorEmail} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <InfoField label="Bedrag" value={formatCurrency(claim.principalAmount)} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <InfoField label="Herkomst" value={claim.origin} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <InfoField label="Externe referentie" value={claim.externalReference} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <InfoField label="Gestart op" value={formatDate(claim.createdAt.toString())} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <InfoField
                  label="Afgesloten op"
                  value={claim.closedAt ? formatDate(claim.closedAt.toString()) : "-"}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <InfoField label="Beschrijving" value={claim.description} />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Stack>
    </Container>
  );
}
