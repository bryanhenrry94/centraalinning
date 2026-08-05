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
import { DocumentsList } from "./DocumentsList";

import { formatDate } from "@/shared/utils/formatters";
import { BlockadeService } from "@/modules/blockade/services/blockade.service";
import { REASONS } from "@/modules/blockade/constants/reason-blockades";
import { ClaimTimelineService } from "@/modules/collection/services/claim-timeline.service";

export default async function BlockadeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const blockade = await BlockadeService.getById(id);

  if (!blockade) {
    notFound();
  }

  const timeline = blockade.originDebtClaimId
    ? await ClaimTimelineService.getForDebtClaim(blockade.originDebtClaimId)
    : [];

  const getLabelForReason = (reason: string) => {
    return REASONS.find((r) => r.value === reason)?.label || reason;
  };

  return (
    <Container
      maxWidth="lg"
      disableGutters
      sx={{ px: { xs: 1, sm: 3 }, py: { xs: 1.5, sm: 4 } }}
    >
      <AppBreadcrumbs
        items={[
          {
            label: "Blokkades",
            href: "/blocks",
          },
          {
            label: "Details",
          },
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
                Auditlog
              </Typography>

              <Stack spacing={1.5}>
                {timeline.map((entry) => (
                  <Box key={entry.id} sx={{ borderBottom: "1px solid", borderColor: "divider", pb: 1.5 }}>
                    <Typography variant="body2" fontWeight={500}>
                      {entry.description}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatDate(entry.createdAt.toISOString())}
                      {entry.createdBy?.fullname ? ` — ${entry.createdBy.fullname}` : ""}
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
      <Typography color="text.secondary" sx={{ minWidth: { xs: "auto", sm: 160 } }}>
        {label}
      </Typography>

      <Typography component="span" fontWeight={500}>
        {value}
      </Typography>
    </Box>
  );
}
