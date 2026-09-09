"use client";

import React, { useEffect } from "react";
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
import {
  Controller,
  Control,
  UseFormGetValues,
  UseFormSetValue,
} from "react-hook-form";

import { PersonType } from "@/shared/constants/person-type";
import { IdentificationType } from "@/shared/constants/identification-type";
import { getInfoPersonAction } from "@/modules/collection/actions/person.actions";
import {
  FarWizardFormValues,
  IDENTIFICATION_TYPE_LABELS,
} from "@/modules/financial-agreement/types/far-wizard.types";

interface FarWizardStepDebtorProps {
  control: Control<FarWizardFormValues>;
  personType: PersonType;
  getValues: UseFormGetValues<FarWizardFormValues>;
  setValue: UseFormSetValue<FarWizardFormValues>;
}

// Stap 1 van 4 — "Gegevens" (Wederpartij/debiteur). A propósito no pide
// nada del participante/tenant: eso ya está implícito en la sesión
// (session.user.tenant_id), aclaración explícita del sponsor.
export const FarWizardStepDebtor: React.FC<FarWizardStepDebtorProps> = ({
  control,
  personType,
  getValues,
  setValue,
}) => {
  const isCompany = personType === PersonType.COMPANY;

  // Mismo patrón que contracts/new/page.tsx: KVK solo aplica a un Bedrijf;
  // los demás tipos (Cédula/Paspoort/Rijbewijs) solo aplican a una Persoon.
  // Si el usuario cambia "Type partij" y el identification_type ya elegido
  // deja de ser válido para el nuevo tipo, se resetea al primero válido.
  const identificationTypeOptions = isCompany
    ? [IdentificationType.KVK]
    : Object.values(IdentificationType).filter(
        (type) => type !== IdentificationType.KVK,
      );

  useEffect(() => {
    const current = getValues("debtor.identification_type");
    if (!identificationTypeOptions.includes(current)) {
      setValue("debtor.identification_type", identificationTypeOptions[0]);
    }
  }, [isCompany]);

  // Mismo patrón que contracts/new/page.tsx: si la persona ya existe en el
  // sistema (cross-tenant, vía Person.identification), autocompletar en vez
  // de obligar a retipear todo — solo completa campos vacíos, nunca pisa
  // lo que el usuario ya haya escrito.
  const handleIdentificationBlur = async () => {
    const identificationType = getValues("debtor.identification_type");
    const identification = getValues("debtor.identification");
    if (!identificationType || !identification) return;

    const personInfo = await getInfoPersonAction(
      identificationType,
      identification,
    );
    if (!personInfo) return;

    if (!getValues("debtor.fullname")) {
      setValue(
        "debtor.fullname",
        personInfo.person_type === PersonType.COMPANY
          ? personInfo.business_name || ""
          : `${personInfo.first_name ?? ""} ${personInfo.last_name ?? ""}`.trim(),
      );
    }
    if (!getValues("debtor.email") && personInfo.email)
      setValue("debtor.email", personInfo.email);
    if (!getValues("debtor.phone") && personInfo.phone)
      setValue("debtor.phone", personInfo.phone);
    if (!getValues("debtor.address") && personInfo.address)
      setValue("debtor.address", personInfo.address);
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" fontWeight={700} gutterBottom>
          Wederpartij (debiteur)
        </Typography>

        <Grid container spacing={2.5}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Controller
              name="debtor.person_type"
              control={control}
              render={({ field }) => (
                <FormControl required>
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

          <Grid size={{ xs: 12, sm: 6 }}></Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <Controller
              name="debtor.identification_type"
              control={control}
              render={({ field, fieldState }) => (
                <FormControl
                  fullWidth
                  required
                  size="small"
                  error={!!fieldState.error}
                >
                  <InputLabel id="far-identification-type-label">
                    Identificatietype
                  </InputLabel>
                  <Select
                    {...field}
                    labelId="far-identification-type-label"
                    label="Identificatietype"
                  >
                    {identificationTypeOptions.map((type) => (
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
                  required
                  size="small"
                  label="Identificatienummer"
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message}
                  onBlur={() => {
                    field.onBlur();
                    handleIdentificationBlur();
                  }}
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
                  required
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
                  required
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
