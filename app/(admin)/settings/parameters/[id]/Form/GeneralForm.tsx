"use client";
import ParameterInput from "@/components/settings/ParameterInput";
import { CardDescription, CardTitle } from "@/components/ui/card";
import {
  ParameterFormData,
  parameterSchema,
} from "@/lib/validations/parameter";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Box,
  Breadcrumbs,
  Card,
  CardContent,
  Grid,
  Link,
  Typography,
} from "@mui/material";
import { FormProvider, useForm } from "react-hook-form";

export const GeneralForm = ({
  title,
  description,
  //   children,
}: {
  title: string;
  description: string;
  //   children: React.ReactNode;
}) => {
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
        <Breadcrumbs aria-label="breadcrumb">
          <Link underline="hover" color="inherit" href="/dashboard">
            Home
          </Link>
          <Link
            underline="hover"
            color="inherit"
            href="/admin/settings/parameters"
          >
            Parameters
          </Link>
          <Typography sx={{ color: "text.primary" }}>
            Editar Parametro
          </Typography>
        </Breadcrumbs>

        {/* <h1>Edit Parameter {id}</h1> */}
        <Card sx={{ mt: 3, p: 2 }}>
          <CardContent>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>

            <Box sx={{ mt: 2 }}>
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
          </CardContent>
        </Card>
      </Box>
    </FormProvider>
  );
};
