"use client";

import React from "react";
import { Card, CardContent, Grid, TextField, Typography } from "@mui/material";
import { Controller, Control } from "react-hook-form";
import { NumericFormat } from "react-number-format";

import { FarWizardFormValues } from "@/modules/financial-agreement/types/far-wizard.types";

interface FarWizardStepAgreementProps {
  control: Control<FarWizardFormValues>;
}

// Stap 2 van 4 — "Overeenkomst" (Afspraakgegevens). "Factuurnummer" mapea a
// FinancialAgreement.reference (ya existente); "Factuurdatum"/"Vervaldatum"
// mapean a las nuevas columnas invoiceDate/dueDate.
export const FarWizardStepAgreement: React.FC<FarWizardStepAgreementProps> = ({
  control,
}) => {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" fontWeight={700} gutterBottom>
          Afspraakgegevens
        </Typography>

        <Grid container spacing={2.5}>
          <Grid size={{ xs: 12 }}>
            <Controller
              name="agreement.description"
              control={control}
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  fullWidth
                  required
                  multiline
                  minRows={2}
                  size="small"
                  label="Omschrijving"
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message}
                />
              )}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <Controller
              name="agreement.reference"
              control={control}
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  fullWidth
                  required
                  size="small"
                  label="Factuurnummer"
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message}
                />
              )}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <Controller
              name="agreement.amount"
              control={control}
              render={({ field, fieldState }) => (
                <NumericFormat
                  customInput={TextField}
                  fullWidth
                  required
                  size="small"
                  label="Totaalbedrag (USD)"
                  value={field.value ?? ""}
                  thousandSeparator
                  decimalScale={2}
                  fixedDecimalScale
                  allowNegative={false}
                  prefix="$ "
                  onValueChange={(values) =>
                    field.onChange(Number(values.value) || 0)
                  }
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message}
                />
              )}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <Controller
              name="agreement.invoiceDate"
              control={control}
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  fullWidth
                  required
                  size="small"
                  type="date"
                  label="Factuurdatum"
                  slotProps={{ inputLabel: { shrink: true } }}
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message}
                />
              )}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <Controller
              name="agreement.dueDate"
              control={control}
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  fullWidth
                  required
                  size="small"
                  type="date"
                  label="Vervaldatum"
                  slotProps={{ inputLabel: { shrink: true } }}
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message}
                />
              )}
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Controller
              name="agreement.notes"
              control={control}
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  fullWidth
                  multiline
                  minRows={2}
                  size="small"
                  label="Aanvullende opmerkingen (optioneel)"
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message}
                />
              )}
            />
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};
