"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Chip, Container, Grid, Stack, Typography } from "@mui/material";
import BusinessRoundedIcon from "@mui/icons-material/BusinessRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import ContactPhoneRoundedIcon from "@mui/icons-material/ContactPhoneRounded";
import AppBreadcrumbs from "@/shared/ui/common/AppBreadcrumbs";
import LoadingUI from "@/shared/ui/loading-ui";
import { notifyError } from "@/shared/ui/notifications";
import { InfoField } from "@/shared/ui/info-field";
import { InfoSectionCard } from "@/shared/ui/info-section-card";
import { formatDate, formatDateTime } from "@/shared/utils/formatters";
import { getAdminLawyerById } from "@/modules/admin/actions/admin.actions";
import { Lawyer } from "@/modules/lawyer/services/lawyer.validators";
import { getProfessionalAdminStatusInfo } from "@/modules/admin/utils/admin-status";

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
  const statusInfo = getProfessionalAdminStatusInfo(lawyer.status);

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
          <Chip size="small" label={statusInfo.label} color={statusInfo.color} />
        </Stack>

        <Grid container spacing={2.5}>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <InfoSectionCard icon={<BusinessRoundedIcon fontSize="small" />} title="Kantoor">
              <InfoField label="Kantoornaam" value={lawyer.companyName} />
              <InfoField label="Land/eiland" value={lawyer.country} />
              <InfoField label="Stad" value={lawyer.city} />
              <InfoField label="Adres" value={lawyer.address} />
            </InfoSectionCard>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <InfoSectionCard icon={<DescriptionRoundedIcon fontSize="small" />} title="Registratie">
              <InfoField label="Status" value={statusInfo.label} />
              <InfoField label="Aangemaakt op" value={formatDate(lawyer.createdAt.toString())} />
              <InfoField label="Laatste wijziging" value={formatDateTime(lawyer.updatedAt.toString())} />
            </InfoSectionCard>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <InfoSectionCard icon={<ContactPhoneRoundedIcon fontSize="small" />} title="Contactgegevens">
              <InfoField label="E-mail" value={lawyer.email} />
              <InfoField label="Telefoon" value={lawyer.phone} />
            </InfoSectionCard>
          </Grid>
        </Grid>
      </Stack>
    </Container>
  );
}
