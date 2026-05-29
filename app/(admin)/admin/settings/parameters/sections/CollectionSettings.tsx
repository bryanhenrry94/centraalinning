"use client";

import { Box, Grid } from "@mui/material";

import ParameterInput from "@/components/settings/ParameterInput";

export default function CollectionSettings() {
  return (
    <Box>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <ParameterInput
            name="collection_fee_rate"
            label="Tasa de cobro(%)"
            type="number"
          />
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <ParameterInput
            name="collection_fee_minimum_amount"
            label="Importe mínimo de cobro"
            type="number"
          />
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <ParameterInput
            name="abb_rate"
            label="Porcentaje de ABB"
            type="number"
          />
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <ParameterInput
            name="company_aanmaning_term_days"
            label="Límite de días para Aanmaning (Compañía)"
            type="number"
          />
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <ParameterInput
            name="consumer_aanmaning_term_days"
            label="Límite de días para Aanmaning (Persona Natural)"
            type="number"
          />
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <ParameterInput
            name="company_sommatie_term_days"
            label="Límite de días para Sommatie (Compañía)"
            type="number"
          />
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <ParameterInput
            name="consumer_sommatie_term_days"
            label="Límite de días para Sommatie (Persona Natural)"
            type="number"
          />
        </Grid>
      </Grid>
    </Box>
  );
}
