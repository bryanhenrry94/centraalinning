"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Grid,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { NumericFormat } from "react-number-format";

import AppBreadcrumbs from "@/shared/ui/common/AppBreadcrumbs";
import { notifyError, notifySuccess } from "@/shared/ui/notifications";
import { formatCurrency } from "@/shared/utils/formatters";
import { DebtorPicker } from "@/modules/collection/components/DebtorPicker";
import { DebtorResponse } from "@/modules/collection/services/debtor.validators";
import { PaymentIntent } from "@/modules/payment/components/PaymentIntent";
import {
  CreateFinancialAgreementInput,
  CreateFinancialAgreementSchema,
} from "@/modules/financial-agreement/services/financial-agreement.validators";
import { createFinancialAgreement } from "@/modules/financial-agreement/actions/financial-agreement.actions";
import { FAR_REGISTRATION_FEE } from "@/modules/financial-agreement/constants/financial-agreement";

const NewFinancialAgreementPage: React.FC = () => {
  const router = useRouter();
  const { data: session } = useSession();

  const [debtor, setDebtor] = useState<DebtorResponse | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);

  const {
    control,
    trigger,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<CreateFinancialAgreementInput>({
    resolver: zodResolver(CreateFinancialAgreementSchema),
    defaultValues: {
      debtorId: "",
      reference: "",
      description: "",
      amount: 0,
      currency: "USD",
    },
  });

  const handleSearchDebtors = async (query: string) => {
    const response = await fetch(`/api/debtors/search?q=${encodeURIComponent(query)}`);
    const data = await response.json();
    return data.data;
  };

  const handleCreateTransaction = async (): Promise<{
    success: boolean;
    error?: string;
    paymentId?: string;
    paymentUrl?: string;
  }> => {
    const valid = await trigger();
    if (!valid) {
      return { success: false, error: "Controleer de ingevulde gegevens" };
    }
    if (!session?.user?.tenant_id) {
      return { success: false, error: "Geen organisatie gevonden" };
    }

    try {
      const result = await createFinancialAgreement(session.user.tenant_id, getValues());
      setCreatedId(result.financialAgreementId);
      return { success: true, paymentId: result.paymentId, paymentUrl: result.paymentUrl };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Registratie mislukt",
      };
    }
  };

  const handlePaymentConfirmed = async () => {
    notifySuccess("Betaling bevestigd. FAR geregistreerd.");
    router.push(createdId ? `/financial-agreements/${createdId}` : "/financial-agreements");
  };

  const handlePaymentFailed = async () => {
    notifyError("De betaling is niet gelukt. Probeer het opnieuw.");
  };

  return (
    <Container maxWidth="md" disableGutters sx={{ px: { xs: 1, sm: 3 }, py: { xs: 1.5, sm: 4 } }}>
      <AppBreadcrumbs
        items={[
          { label: "FAR — Financiële Afspraken Registreren", href: "/financial-agreements" },
          { label: "Nieuw" },
        ]}
      />

      <Box mb={3}>
        <Typography variant="h4" fontWeight={700}>
          Nieuwe FAR registreren
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Registro independiente de un acuerdo financiero. No inicia ningún seguimiento
          administrativo (AOP) — eso, si hace falta, se inicia después como un expediente nuevo.
        </Typography>
      </Box>

      <form>
        <Stack spacing={3}>
          <Card>
            <CardContent>
              <Grid container spacing={2.5}>
                <Grid size={{ xs: 12 }}>
                  <Controller
                    name="debtorId"
                    control={control}
                    render={({ field }) => (
                      <Box>
                        <DebtorPicker
                          value={debtor}
                          onChange={(option) => {
                            setDebtor(option);
                            field.onChange(option?.id || "");
                          }}
                          onSearch={handleSearchDebtors}
                        />
                        {errors.debtorId && (
                          <Typography variant="caption" color="error.main" sx={{ display: "block", mt: 0.5 }}>
                            {errors.debtorId.message}
                          </Typography>
                        )}
                      </Box>
                    )}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Controller
                    name="amount"
                    control={control}
                    render={({ field, fieldState }) => (
                      <NumericFormat
                        customInput={TextField}
                        fullWidth
                        label="Bedrag van de afspraak"
                        size="small"
                        value={field.value ?? ""}
                        thousandSeparator
                        decimalScale={2}
                        fixedDecimalScale
                        allowNegative={false}
                        prefix="$ "
                        onValueChange={(values) => field.onChange(Number(values.value) || 0)}
                        error={!!fieldState.error}
                        helperText={fieldState.error?.message}
                      />
                    )}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Controller
                    name="reference"
                    control={control}
                    render={({ field }) => (
                      <TextField {...field} value={field.value ?? ""} fullWidth size="small" label="Referentie (optioneel)" />
                    )}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Controller
                    name="description"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        value={field.value ?? ""}
                        fullWidth
                        multiline
                        minRows={2}
                        size="small"
                        label="Omschrijving (optioneel)"
                      />
                    )}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Paper variant="outlined" sx={{ p: 2.5, textAlign: "center" }}>
            <Typography variant="body2" color="text.secondary">
              Registratiekosten (FAR)
            </Typography>
            <Typography variant="h4" fontWeight={700} color="primary.main">
              {formatCurrency(FAR_REGISTRATION_FEE)}
            </Typography>
          </Paper>

          <Stack direction="row" spacing={1.5} justifyContent="flex-end">
            <Button onClick={() => router.push("/financial-agreements")} disabled={isSubmitting}>
              Annuleren
            </Button>
            <PaymentIntent
              onCreateTransaction={handleCreateTransaction}
              onPaymentConfirmed={handlePaymentConfirmed}
              onPaymentFailed={handlePaymentFailed}
            />
          </Stack>
        </Stack>
      </form>
    </Container>
  );
};

export default NewFinancialAgreementPage;
