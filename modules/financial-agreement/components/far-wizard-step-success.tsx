"use client";

import React from "react";
import { Box, Button, Card, CardContent, Grid, Stack, Typography } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

import { formatCurrency, formatDate } from "@/shared/utils/formatters";

interface FarWizardStepSuccessProps {
  farNumber: string;
  debtorName: string;
  amount: number;
  createdAt: string;
  onGoToList: () => void;
  onRegisterAnother: () => void;
}

// Pantallas 6-7 del mockup fusionadas en una sola vista: PaymentIntent
// (modules/payment/components/PaymentIntent.tsx) ya confirma el pago de
// forma síncrona vía polling y solo entonces llama a onPaymentConfirmed —
// no existe hoy un estado intermedio "in verwerking" separado en el flujo
// de Sentoo, así que no se inventa una pantalla extra para eso acá.
export const FarWizardStepSuccess: React.FC<FarWizardStepSuccessProps> = ({
  farNumber,
  debtorName,
  amount,
  createdAt,
  onGoToList,
  onRegisterAnother,
}) => {
  return (
    <Card>
      <CardContent sx={{ textAlign: "center", py: 5 }}>
        <CheckCircleIcon color="success" sx={{ fontSize: 56, mb: 1 }} />
        <Typography variant="h5" fontWeight={700} gutterBottom>
          FAR geregistreerd
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          De betaling is bevestigd en de financiële afspraak is geregistreerd.
        </Typography>

        <Box sx={{ maxWidth: 420, mx: "auto", mb: 3 }}>
          <Grid container spacing={2} textAlign="left">
            <Grid size={{ xs: 12 }}>
              <Typography variant="caption" color="text.secondary" display="block">
                Dossiernummer
              </Typography>
              <Typography variant="body2" fontWeight={700}>
                {farNumber}
              </Typography>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <Typography variant="caption" color="text.secondary" display="block">
                Debiteur
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {debtorName || "-"}
              </Typography>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <Typography variant="caption" color="text.secondary" display="block">
                Bedrag
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {formatCurrency(amount)}
              </Typography>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <Typography variant="caption" color="text.secondary" display="block">
                Datum
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {formatDate(createdAt)}
              </Typography>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <Typography variant="caption" color="text.secondary" display="block">
                Status
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                Geregistreerd
              </Typography>
            </Grid>
          </Grid>
        </Box>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} justifyContent="center">
          <Button variant="outlined" onClick={onRegisterAnother}>
            Nieuwe FAR registreren
          </Button>
          <Button variant="contained" onClick={onGoToList}>
            Naar mijn dossiers
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
};
