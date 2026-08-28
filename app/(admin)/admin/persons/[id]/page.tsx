"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, Container, Grid, Stack, Typography } from "@mui/material";
import AppBreadcrumbs from "@/shared/ui/common/AppBreadcrumbs";
import LoadingUI from "@/shared/ui/loading-ui";
import { notifyError } from "@/shared/ui/notifications";
import { formatDate } from "@/shared/utils/formatters";
import { InfoField } from "@/shared/ui/info-field";
import { getAdminPersonById } from "@/modules/admin/actions/admin.actions";

type PersonDetail = Awaited<ReturnType<typeof getAdminPersonById>>;

export default function AdminPersonDetailPage() {
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [person, setPerson] = useState<PersonDetail | null>(null);

  useEffect(() => {
    getAdminPersonById(params.id as string)
      .then(setPerson)
      .catch(() => notifyError("Kon persoon niet laden"))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) return <LoadingUI />;
  if (!person) {
    return (
      <Container sx={{ py: 4 }}>
        <Typography>Persoon niet gevonden.</Typography>
      </Container>
    );
  }

  const name = `${person.first_name ?? ""} ${person.last_name ?? ""}`.trim() || person.business_name || "-";

  return (
    <Container maxWidth="md" disableGutters sx={{ px: { xs: 1, sm: 3 }, py: { xs: 1.5, sm: 4 } }}>
      <AppBreadcrumbs
        items={[
          { label: "CFSB Admin", href: "/admin" },
          { label: "Personenregister", href: "/admin/persons" },
          { label: name },
        ]}
      />
      <Stack spacing={3}>
        <Typography variant="h4" fontWeight={700}>
          {name}
        </Typography>
        <Card>
          <CardContent>
            <Grid container spacing={2.5}>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <InfoField label="Persoonlijk nummer" value={person.personal_number} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <InfoField label="Type" value={person.person_type} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <InfoField
                  label="Identificatie"
                  value={`${person.identification_type} ${person.identification}`}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <InfoField label="E-mail" value={person.email} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <InfoField label="Telefoon" value={person.phone} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <InfoField label="Land/eiland" value={person.country_code} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <InfoField label="Aangemaakt op" value={formatDate(person.created_at.toString())} />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <InfoField label="Adres" value={person.address} />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Stack>
    </Container>
  );
}
