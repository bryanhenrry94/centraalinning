"use client";

import { Grid } from "@mui/material";

import ParameterSection from "@/components/settings/ParameterSection";
import ParameterInput from "@/components/settings/ParameterInput";

export default function BankSettings() {
  return (
    <ParameterSection
      title="Bank Information"
      description="Configure bank accounts and transfer information"
    >
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <ParameterInput name="bank_name" label="Bank Name" />
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <ParameterInput name="bank_account" label="Bank Account" />
        </Grid>
      </Grid>
    </ParameterSection>
  );
}
