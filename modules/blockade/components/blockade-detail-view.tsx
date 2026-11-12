import {
  Box,
  Card,
  CardContent,
  Container,
  Grid,
  Stack,
  Typography,
} from "@mui/material";

import { notFound } from "next/navigation";

import AppBreadcrumbs from "@/shared/ui/common/AppBreadcrumbs";
import { DocumentsList } from "./blockade-documents-list";

import { formatDate } from "@/shared/utils/formatters";
import { BlockadeService } from "@/modules/blockade/services/blockade.service";
import { REASONS } from "@/modules/blockade/constants/reason-blockades";
import { ClaimTimelineService } from "@/modules/collection/services/claim-timeline.service";

const getLabelForReason = (reason: string) => {
  return REASONS.find((r) => r.value === reason)?.label || reason;
};

// Detalle BLK standalone — reutilizado bajo /blocks/[id] (ruta histórica) y
// /dossiers/[id] (overzicht "Mijn dossiers" unificado), mismo componente sin
// duplicar lógica. A diferencia de los otros dos detail views (FAR/AOP, que
// son Client Components con useParams()), este es un Server Component
// async, así que recibe el :id explícito como prop en vez de leerlo del
// router.
export async function BlockadeDetailView({ id }: { id: string }) {
  const blockade = await BlockadeService.getById(id);

  if (!blockade) {
    notFound();
  }

  const timeline = blockade.originDebtClaimId
    ? await ClaimTimelineService.getForDebtClaim(blockade.originDebtClaimId)
    : [];

  return (
    <Container
      maxWidth="lg"
      disableGutters
      sx={{ px: { xs: 1, sm: 3 }, py: { xs: 1, sm: 2 } }}
    >
      <AppBreadcrumbs
        items={[
          { label: "Mijn dossiers", href: "/dossiers" },
          { label: "Details" },
        ]}
      />

      <Stack spacing={3}>
        {/* General Information */}
        <Card>
          <CardContent>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Informatie
            </Typography>

            <Grid container spacing={4}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Stack spacing={2}>
                  <InfoRow
                    label="Schuldenaar"
                    value={
                      blockade.debtor.person.first_name +
                      " " +
                      blockade.debtor.person.last_name
                    }
                  />

                  <InfoRow
                    label="Registratiedatum"
                    value={formatDate(blockade.createdAt.toISOString())}
                  />

                  <InfoRow
                    label="Reden blokade"
                    value={getLabelForReason(blockade.reason)}
                  />

                  {blockade.reasonNote && (
                    <InfoRow label="Toelichting" value={blockade.reasonNote} />
                  )}
                </Stack>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Audit trail */}
        {timeline.length > 0 && (
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Activiteitenlog
              </Typography>

              <Stack spacing={1.5}>
                {timeline.map((entry) => (
                  <Box
                    key={entry.id}
                    sx={{
                      borderBottom: "1px solid",
                      borderColor: "divider",
                      pb: 1.5,
                    }}
                  >
                    <Typography variant="body2" fontWeight={500}>
                      {entry.description}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatDate(entry.createdAt.toISOString())}
                      {entry.createdBy?.fullname
                        ? ` — ${entry.createdBy.fullname}`
                        : ""}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        )}

        {/* Documents */}
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 12 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  Documenten
                </Typography>

                <DocumentsList
                  documents={blockade.documents.map((doc) => ({
                    ...doc,
                    file_name: doc.fileName,
                  }))}
                />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Stack>
    </Container>
  );
}

type InfoRowProps = {
  label: string;
  value?: React.ReactNode;
};

function InfoRow({ label, value }: InfoRowProps) {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: { xs: "column", sm: "row" },
        gap: { xs: 0.25, sm: 2 },
      }}
    >
      <Typography
        color="text.secondary"
        sx={{ minWidth: { xs: "auto", sm: 160 } }}
      >
        {label}
      </Typography>

      <Typography component="span" fontWeight={500}>
        {value}
      </Typography>
    </Box>
  );
}
