"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Chip, Container, Grid, Stack, Typography } from "@mui/material";
import ContactPhoneRoundedIcon from "@mui/icons-material/ContactPhoneRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import AppBreadcrumbs from "@/shared/ui/common/AppBreadcrumbs";
import LoadingUI from "@/shared/ui/loading-ui";
import { notifyError } from "@/shared/ui/notifications";
import { InfoField } from "@/shared/ui/info-field";
import { InfoSectionCard } from "@/shared/ui/info-section-card";
import { formatDate, formatDateTime } from "@/shared/utils/formatters";
import { getAdminBailiffById } from "@/modules/admin/actions/admin.actions";
import { Bailiff } from "@/modules/bailiff/services/bailiff.validators";
import { getProfessionalAdminStatusInfo } from "@/modules/admin/utils/admin-status";

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

  const statusInfo = getProfessionalAdminStatusInfo(bailiff.status ?? "-");

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
          <Chip size="small" label={statusInfo.label} color={statusInfo.color} />
        </Stack>

        <Grid container spacing={2.5}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <InfoSectionCard icon={<ContactPhoneRoundedIcon fontSize="small" />} title="Contactgegevens">
              <InfoField label="E-mail" value={bailiff.email} />
              <InfoField label="Telefoon" value={bailiff.phone} />
            </InfoSectionCard>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <InfoSectionCard icon={<DescriptionRoundedIcon fontSize="small" />} title="Registratie">
              <InfoField label="Status" value={statusInfo.label} />
              <InfoField label="Aangemaakt op" value={formatDate(bailiff.created_at.toString())} />
              <InfoField label="Laatste wijziging" value={formatDateTime(bailiff.updated_at.toString())} />
            </InfoSectionCard>
          </Grid>
        </Grid>
      </Stack>
    </Container>
  );
}
