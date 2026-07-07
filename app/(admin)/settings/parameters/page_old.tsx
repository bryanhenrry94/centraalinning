"use client";

import { Box, Card, Tabs, Tab, Typography, Button } from "@mui/material";
import { useEffect, useState } from "react";

import { FormProvider, useForm } from "react-hook-form";

import { zodResolver } from "@hookform/resolvers/zod";

import CollectionSettings from "./sections/CollectionSettings";
import InvoiceSettings from "./sections/InvoiceSettings";
import BankSettings from "./sections/BankSettings";

import {
  parameterSchema,
  ParameterFormData,
} from "@/modules/settings/services/parameter/parameter.validators";

export default function ParametersPage() {
  const [tab, setTab] = useState(0);

  const methods = useForm<ParameterFormData>({
    resolver: zodResolver(parameterSchema),

    defaultValues: {
      collection_fee_rate: 0,
      collection_fee_minimum_amount: 0,

      abb_rate: 0,

      invoice_prefix: "",
      invoice_sequence: 0,
      invoice_number_length: 8,

      bank_name: "",
      bank_account: "",
    },
  });

  const {
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = methods;

  useEffect(() => {
    async function loadData() {
      const response = await fetch("/api/admin/settings/parameters");

      const data = await response.json();

      reset(data);
    }

    loadData();
  }, [reset]);

  async function onSubmit(values: ParameterFormData) {
    await fetch("/api/admin/settings/parameters", {
      method: "PUT",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify(values),
    });
  }

  return (
    <FormProvider {...methods}>
      <Box component="form" onSubmit={handleSubmit(onSubmit)}>
        <Typography variant="h4" mb={3}>
          Globale Parameters
        </Typography>

        <Card sx={{ p: 3 }}>
          <Tabs value={tab} onChange={(_, value) => setTab(value)}>
            <Tab label="Vordering" />
            <Tab label="Facturen" />
            <Tab label="Banken" />
          </Tabs>

          <Box mt={4}>
            {tab === 0 && <CollectionSettings />}
            {tab === 1 && <InvoiceSettings />}
            {tab === 2 && <BankSettings />}
          </Box>

          <Box
            sx={{
              position: "sticky",
              bottom: 0,              
              pt: 3,
              mt: 4,
              borderTop: "1px solid #eee",
            }}
          >
            <Button type="submit" variant="contained" disabled={isSubmitting}>
              Save Changes
            </Button>
          </Box>
        </Card>
      </Box>
    </FormProvider>
  );
}
