"use client";

import React from "react";
import {
  Card,
  CardContent,
  FormControl,
  FormControlLabel,
  FormHelperText,
  FormLabel,
  Grid,
  InputLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import { Controller, Control } from "react-hook-form";

import { PersonType } from "@/shared/constants/person-type";
import { IdentificationType } from "@/shared/constants/identification-type";
import {
  FarWizardFormValues,
  IDENTIFICATION_TYPE_LABELS,
} from "@/modules/financial-agreement/types/far-wizard.types";

interface FarWizardStepDebtorProps {
  control: Control<FarWizardFormValues>;
  personType: PersonType;
}

// Stap 1 van 4 — "Gegevens" (Wederpartij/debiteur). A propósito no pide
// nada del participante/tenant: eso ya está implícito en la sesión
// (session.user.tenant_id), aclaración explícita del sponsor.
export const FarWizardStepDebtor: React.FC<FarWizardStepDebtorProps> = ({
  control,
  personType,
}) => {
  const isCompany = personType === PersonType.COMPANY;

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" fontWeight={700} gutterBottom>
          Wederpartij (debiteur)
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
          Gegevens van de partij waarmee de financiële afspraak wordt geregistreerd.
        </Typography>

        <Grid container spacing={2.5}>
          <Grid size={{ xs: 12 }}>
            <Controller
              name="debtor.person_type"
              control={control}
              render={({ field }) => (
                <FormControl>
                  <FormLabel>Type partij</FormLabel>
                  <RadioGroup {...field} row>
                    <FormControlLabel
                      value={PersonType.INDIVIDUAL}
                      control={<Radio />}
                      label="Persoon"
                    />
                    <FormControlLabel
                      value={PersonType.COMPANY}
                      control={<Radio />}
                      label="Bedrijf"
                    />
                  </RadioGroup>
                </FormControl>
              )}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <Controller
              name="debtor.identification_type"
              control={control}
              render={({ field, fieldState }) => (
                <FormControl fullWidth size="small" error={!!fieldState.error}>
                  <InputLabel id="far-identification-type-label">
                    Identificatietype
                  </InputLabel>
                  <Select
                    {...field}
                    labelId="far-identification-type-label"
                    label="Identificatietype"
                  >
                    {Object.values(IdentificationType).map((type) => (
                      <MenuItem key={type} value={type}>
                        {IDENTIFICATION_TYPE_LABELS[type]}
                      </MenuItem>
                    ))}
                  </Select>
                  <FormHelperText>{fieldState.error?.message}</FormHelperText>
                </FormControl>
              )}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <Controller
              name="debtor.identification"
              control={control}
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  fullWidth
                  size="small"
                  label="Identificatienummer"
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message}
                />
              )}
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Controller
              name="debtor.fullname"
              control={control}
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  fullWidth
                  size="small"
                  label={isCompany ? "Naam (bedrijfsnaam)" : "Naam"}
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message}
                />
              )}
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Controller
              name="debtor.address"
              control={control}
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  fullWidth
                  size="small"
                  label="Vestigingsadres"
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message}
                />
              )}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <Controller
              name="debtor.phone"
              control={control}
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  fullWidth
                  size="small"
                  label="Telefoonnummer (optioneel)"
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message}
                />
              )}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <Controller
              name="debtor.email"
              control={control}
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  fullWidth
                  size="small"
                  type="email"
                  label="E-mailadres"
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
