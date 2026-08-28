"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, Chip, Container, Grid, Stack, Typography } from "@mui/material";
import AppBreadcrumbs from "@/shared/ui/common/AppBreadcrumbs";
import LoadingUI from "@/shared/ui/loading-ui";
import { notifyError } from "@/shared/ui/notifications";
import { InfoField } from "@/shared/ui/info-field";
import { getAdminLawyerById } from "@/modules/admin/actions/admin.actions";
import { Lawyer } from "@/modules/lawyer/services/lawyer.validators";

export default function AdminLawyerDetailPage() {
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [lawyer, setLawyer] = useState<Lawyer | null>(null);

  useEffect(() => {
    getAdminLawyerById(params.id as string)
      .then((res) => setLawyer(res.success ? (res.data ?? null) : null))
      .catch(() => notifyError("Kon advocaat niet laden"))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) return <LoadingUI />;
  if (!lawyer) {
    return (
      <Container sx={{ py: 4 }}>
        <Typography>Advocaat niet gevonden.</Typography>
      </Container>
    );
  }

  const name = `${lawyer.firstName} ${lawyer.lastName}`;

  return (
    <Container maxWidth="md" disableGutters sx={{ px: { xs: 1, sm: 3 }, py: { xs: 1.5, sm: 4 } }}>
      <AppBreadcrumbs
        items={[
          { label: "CFSB Admin", href: "/admin" },
          { label: "Advocaten", href: "/admin/lawyers" },
          { label: name },
        ]}
      />
      <Stack spacing={3}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Typography variant="h4" fontWeight={700}>
            {name}
          </Typography>
          <Chip size="small" label={lawyer.status} color={lawyer.status === "ACTIVE" ? "success" : "default"} />
        </Stack>
        <Card>
          <CardContent>
            <Grid container spacing={2.5}>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <InfoField label="Kantoor" value={lawyer.companyName} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <InfoField label="Balie-registratie" value={lawyer.barRegistration} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <InfoField label="E-mail" value={lawyer.email} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <InfoField label="Telefoon" value={lawyer.phone} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <InfoField label="Mobiel" value={lawyer.mobile} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <InfoField label="Stad" value={lawyer.city} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <InfoField label="Land" value={lawyer.country} />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <InfoField label="Adres" value={lawyer.address} />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <InfoField label="Notities" value={lawyer.notes} />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Stack>
    </Container>
  );
}
