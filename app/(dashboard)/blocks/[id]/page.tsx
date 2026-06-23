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

import AppBreadcrumbs from "@/components/common/AppBreadcrumbs";
import { DocumentsList } from "./DocumentsList";

import { formatDate } from "@/utils/formatters";
import { BlockadeService } from "@/services/blockade/blockade.service";

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

  return (
    <Container maxWidth="lg">
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
                    value={
                      blockade.reason === "UNPAID_PAYMENT"
                        ? "Niet nagekomen betalingsverplichting"
                        : "-"
                    }
                  />
                </Stack>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

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
    <Box display="flex" gap={2}>
      <Typography color="text.secondary" minWidth={160}>
        {label}
      </Typography>

      <Typography component="span" fontWeight={500}>
        {value}
      </Typography>
    </Box>
  );
}
