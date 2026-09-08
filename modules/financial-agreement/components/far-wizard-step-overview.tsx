"use client";

import React from "react";
import {
  Box,
  Card,
  CardContent,
  Divider,
  Grid,
  Stack,
  Typography,
} from "@mui/material";

import { formatCurrency } from "@/shared/utils/formatters";
import { PersonType } from "@/shared/constants/person-type";
import {
  FarWizardFormValues,
  IDENTIFICATION_TYPE_LABELS,
} from "@/modules/financial-agreement/types/far-wizard.types";

interface FarWizardStepOverviewProps {
  values: FarWizardFormValues;
  documentCount: number;
  onEditStep: (step: number) => void;
}

function SummaryRow({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <Grid size={{ xs: 12, sm: 6 }}>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ textTransform: "uppercase", letterSpacing: 0.4, display: "block" }}
      >
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={600}>
        {value || "-"}
      </Typography>
    </Grid>
  );
}

function SummaryCard({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
          <Typography variant="subtitle1" fontWeight={700}>
            {title}
          </Typography>
          <Typography
            variant="body2"
            color="primary.main"
            sx={{ cursor: "pointer", fontWeight: 600 }}
            onClick={onEdit}
          >
            Wijzigen
          </Typography>
        </Stack>
        <Divider sx={{ mb: 2 }} />
        {children}
      </CardContent>
    </Card>
  );
}

// Stap 4 van 4 — "Overzicht". Cada bloque linkea de vuelta al paso donde se
// editan esos datos ("Wijzigen"). El botón real de submit ("Registreren en
// betalen") es el PaymentIntent que se renderiza en far-registration-wizard.tsx.
export const FarWizardStepOverview: React.FC<FarWizardStepOverviewProps> = ({
  values,
  documentCount,
  onEditStep,
}) => {
  const { debtor, agreement } = values;

  return (
    <Stack spacing={2.5}>
      <SummaryCard title="Wederpartij (debiteur)" onEdit={() => onEditStep(0)}>
        <Grid container spacing={2}>
          <SummaryRow
            label="Type partij"
            value={debtor.person_type === PersonType.COMPANY ? "Bedrijf" : "Persoon"}
          />
          <SummaryRow label="Naam" value={debtor.fullname} />
          <SummaryRow
            label="Identificatie"
            value={`${IDENTIFICATION_TYPE_LABELS[debtor.identification_type]} — ${debtor.identification}`}
          />
          <SummaryRow label="Vestigingsadres" value={debtor.address} />
          <SummaryRow label="Telefoonnummer" value={debtor.phone} />
          <SummaryRow label="E-mailadres" value={debtor.email} />
        </Grid>
      </SummaryCard>

      <SummaryCard title="Afspraakgegevens" onEdit={() => onEditStep(1)}>
        <Grid container spacing={2}>
          <SummaryRow label="Omschrijving" value={agreement.description} />
          <SummaryRow label="Factuurnummer" value={agreement.reference} />
          <SummaryRow label="Totaalbedrag" value={formatCurrency(agreement.amount)} />
          <SummaryRow label="Factuurdatum" value={agreement.invoiceDate} />
          <SummaryRow label="Vervaldatum" value={agreement.dueDate} />
          <SummaryRow label="Opmerkingen" value={agreement.notes} />
        </Grid>
      </SummaryCard>

      <SummaryCard title={`Documenten (${documentCount})`} onEdit={() => onEditStep(2)}>
        <Box>
          <Typography variant="body2" color="text.secondary">
            {documentCount === 0
              ? "Geen documenten toegevoegd."
              : `${documentCount} document${documentCount === 1 ? "" : "en"} toegevoegd.`}
          </Typography>
        </Box>
      </SummaryCard>
    </Stack>
  );
};
