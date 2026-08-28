"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, Container, Grid, Stack, Typography } from "@mui/material";
import AppBreadcrumbs from "@/shared/ui/common/AppBreadcrumbs";
import LoadingUI from "@/shared/ui/loading-ui";
import { notifyError } from "@/shared/ui/notifications";
import { formatDate } from "@/shared/utils/formatters";
import { InfoField } from "@/shared/ui/info-field";
import { getAdminTenantById } from "@/modules/admin/actions/admin.actions";

type TenantDetail = Awaited<ReturnType<typeof getAdminTenantById>>;

export default function AdminTenantDetailPage() {
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [tenant, setTenant] = useState<TenantDetail | null>(null);

  useEffect(() => {
    getAdminTenantById(params.id as string)
      .then(setTenant)
      .catch(() => notifyError("Kon deelnemer niet laden"))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) return <LoadingUI />;
  if (!tenant) {
    return (
      <Container sx={{ py: 4 }}>
        <Typography>Deelnemer niet gevonden.</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" disableGutters sx={{ px: { xs: 1, sm: 3 }, py: { xs: 1.5, sm: 4 } }}>
      <AppBreadcrumbs
        items={[
          { label: "CFSB Admin", href: "/admin" },
          { label: "Deelnemers", href: "/admin/tenants" },
          { label: tenant.name },
        ]}
      />
      <Stack spacing={3}>
        <Typography variant="h4" fontWeight={700}>
          {tenant.name}
        </Typography>
        <Card>
          <CardContent>
            <Grid container spacing={2.5}>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <InfoField label="CFSB-code" value={tenant.code} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <InfoField label="Subdomein" value={tenant.subdomain} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <InfoField label="Land/eiland" value={tenant.country_code} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <InfoField label="Contact e-mail" value={tenant.contact_email} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <InfoField label="Telefoon" value={tenant.phone} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <InfoField label="KVK" value={tenant.kvk} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <InfoField label="Juridische naam" value={tenant.legal_name} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <InfoField label="Status" value={tenant.is_active ? "Actief" : "Inactief"} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <InfoField label="Aangemaakt op" value={formatDate(tenant.created_at.toString())} />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <InfoField label="Adres" value={tenant.address} />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Stack>
    </Container>
  );
}
