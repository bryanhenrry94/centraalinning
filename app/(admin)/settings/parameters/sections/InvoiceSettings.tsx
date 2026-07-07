"use client";

import { Grid } from "@mui/material";

import ParameterSection from "@/modules/settings/components/ParameterSection";
import ParameterInput from "@/modules/settings/components/ParameterInput";

export default function InvoiceSettings() {
  return (
    <ParameterSection
      title="Invoice Configuration"
      description="Manage invoice numbering and billing settings"
    >
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 4 }}>
          <ParameterInput name="invoice_prefix" label="Invoice Prefix" />
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <ParameterInput
            name="invoice_sequence"
            label="Invoice Sequence"
            type="number"
          />
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <ParameterInput
            name="invoice_number_length"
            label="Invoice Number Length"
            type="number"
          />
        </Grid>
      </Grid>
    </ParameterSection>
  );
}
