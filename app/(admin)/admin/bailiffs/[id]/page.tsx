"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, Chip, Container, Grid, Stack, Typography } from "@mui/material";
import AppBreadcrumbs from "@/shared/ui/common/AppBreadcrumbs";
import LoadingUI from "@/shared/ui/loading-ui";
import { notifyError } from "@/shared/ui/notifications";
import { InfoField } from "@/shared/ui/info-field";
import { getAdminBailiffById } from "@/modules/admin/actions/admin.actions";
import { Bailiff } from "@/modules/bailiff/services/bailiff.validators";

export default function AdminBailiffDetailPage() {
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [bailiff, setBailiff] = useState<Bailiff | null>(null);

  useEffect(() => {
    getAdminBailiffById(params.id as string)
      .then((res) => setBailiff(res.success ? (res.data ?? null) : null))
      .catch(() => notifyError("Kon deurwaarder niet laden"))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) return <LoadingUI />;
  if (!bailiff) {
    return (
      <Container sx={{ py: 4 }}>
        <Typography>Deurwaarder niet gevonden.</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" disableGutters sx={{ px: { xs: 1, sm: 3 }, py: { xs: 1.5, sm: 4 } }}>
      <AppBreadcrumbs
        items={[
          { label: "CFSB Admin", href: "/admin" },
          { label: "Deurwaarders", href: "/admin/bailiffs" },
          { label: bailiff.fullname },
        ]}
      />
      <Stack spacing={3}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Typography variant="h4" fontWeight={700}>
            {bailiff.fullname}
          </Typography>
          <Chip
            size="small"
            label={bailiff.status ?? "-"}
            color={bailiff.status === "ACTIVE" ? "success" : "default"}
          />
        </Stack>
        <Card>
          <CardContent>
            <Grid container spacing={2.5}>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <InfoField label="E-mail" value={bailiff.email} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <InfoField label="Telefoon" value={bailiff.phone} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <InfoField label="Tenant-ID" value={bailiff.tenant_id} />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Stack>
    </Container>
  );
}
