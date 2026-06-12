import {
  Box,
  Card,
  CardContent,
  Chip,
  Container,
  Grid,
  Stack,
  Typography,
} from "@mui/material";

import { notFound } from "next/navigation";

import AppBreadcrumbs from "@/components/common/AppBreadcrumbs";
import { ContractService } from "@/services/contract/contract.service";
import { DocumentsList } from "./DocumentsList";

import { formatCurrency, formatDate } from "@/utils/formatters";
import { getContractTypeLabel } from "@/utils/contract-type";
import {
  getContractStatusColor,
  getContractStatusLabel,
} from "@/utils/contract-status";
import { getContractPartyRoleLabel } from "@/utils/contract-party-role";

export default async function ContractDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const contract = await ContractService.getById(id);

  if (!contract) {
    notFound();
  }

  const amount = parseFloat(contract.amount.toString());

  const installmentAmount = contract.installment_amount
    ? parseFloat(contract.installment_amount.toString())
    : null;

  return (
    <Container maxWidth="lg">
      <AppBreadcrumbs
        items={[
          {
            label: "Financiële afspraken",
            href: "/contracts",
          },
          {
            label: "Details",
          },
        ]}
      />

      <Stack spacing={3}>
        {/* Header */}
        <Box>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Box>
              <Typography variant="h4" fontWeight={700}>
                {contract.reference_number}
              </Typography>
            </Box>

            <Chip
              label={getContractStatusLabel(contract.status)}
              color={getContractStatusColor(contract.status)}
              sx={{
                fontWeight: 700,
              }}
            />
          </Stack>
        </Box>

        {/* General Information */}
        <Card>
          <CardContent>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Algemene informatie
            </Typography>

            <Grid container spacing={4}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Stack spacing={2}>
                  <InfoRow
                    label="Registratienummer"
                    value={contract.reference_number}
                  />

                  <InfoRow
                    label="Registratiedatum"
                    value={formatDate(contract.contract_date.toISOString())}
                  />

                  <InfoRow
                    label="Type afspraak"
                    value={getContractTypeLabel(contract.contract_type)}
                  />

                  <InfoRow
                    label="Beschrijving"
                    value={contract.description || "-"}
                  />
                </Stack>
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <Stack spacing={2}>
                  <InfoRow
                    label="Totaalbedrag"
                    value={formatCurrency(amount)}
                  />

                  <InfoRow
                    label="Aantal termijnen"
                    value={contract.installment_count ?? "1"}
                  />

                  <InfoRow
                    label="Bedrag per termijn"
                    value={
                      installmentAmount
                        ? formatCurrency(installmentAmount)
                        : "-"
                    }
                  />

                  <InfoRow
                    label="Periode"
                    value={`${formatDate(
                      contract.start_date.toISOString(),
                    )} - ${
                      contract.end_date
                        ? formatDate(contract.end_date.toISOString())
                        : "Doorlopend"
                    }`}
                  />
                </Stack>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Parties */}
        <Card>
          <CardContent>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Betrokken partijen
            </Typography>

            <Grid container spacing={3}>
              {contract.parties.map((party) => (
                <Grid key={party.id} size={{ xs: 12, md: 6 }}>
                  <Typography fontWeight={600} mb={2}>
                    {getContractPartyRoleLabel(party.role)}
                  </Typography>

                  <Stack spacing={1}>
                    <InfoRow label="Naam" value={party.fullname} />

                    <InfoRow label="E-mail" value={party.email} />

                    <InfoRow label="Telefoon" value={party.phone} />

                    <InfoRow label="ID-nummer" value={party.identification} />

                    <InfoRow label="Adres" value={party.address || "-"} />
                  </Stack>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>

        {/* Documents */}
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  Documenten
                </Typography>

                <DocumentsList documents={contract.documents} />
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
