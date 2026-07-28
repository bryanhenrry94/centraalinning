"use client";

import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CircularProgress,
  Container,
  Divider,
  Stack,
  Typography,
} from "@mui/material";

import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";

import { useSession } from "next-auth/react";

import { createSentooPayment } from "@/actions/sentoo.actions";

import { formatCurrency } from "@/shared/utils/formatters";
import { notifyError, notifyInfo } from "@/shared/ui/notifications";
import { generateUUID } from "@/shared/utils/uuid";

import {
  PaymentCreate,
  PaymentType,
} from "@/modules/payment/services/payment.validators";
import { createFinancialReportRequest } from "@/modules/payment/actions/financial-report.actions";
import { getDebtorByUserId } from "@/modules/collection/actions/debtor.actions";
import { getParameterAction } from "@/modules/settings/actions/parameter.actions";
import { registerDebtPayment } from "@/modules/payment/actions/payment.actions";

const VerklaringPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [price, setPrice] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const { data: session } = useSession();

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const parameter = await getParameterAction();

        if (parameter?.report_financial_pricing) {
          setPrice(Number(parameter.report_financial_pricing));
        }
      } catch (err) {
        console.error(err);
        setError("Kon de prijs van het rapport niet laden.");
      }
    };

    fetchPrice();
  }, []);

  const handlePayment = async () => {
    // Evita doble ejecución
    if (loading) return;

    try {
      setLoading(true);
      setError(null);

      /**
       * Validaciones iniciales
       */
      const tenantId = session?.user?.tenant_id;

      if (!tenantId) {
        throw new Error("Geen tenant gevonden.");
      }

      if (!price || price <= 0) {
        throw new Error("Ongeldig bedrag.");
      }

      /**
       * Generar identificador único
       */
      const requestId = generateUUID();

      const reference = `FIN-${requestId}`;

      /**
       * Abrir pestaña inmediatamente
       * para evitar popup blockers
       */
      const paymentWindow = window.open("", "_blank");

      /**
       * Crear pago en Sentoo
       */
      const sentooResponse = await createSentooPayment({
        amount: price,
        description: "Financieel Rapport",
        reference: "financieel_rapport",
      });

      console.log("Sentoo payment response:", sentooResponse);

      /**
       * Validar respuesta Sentoo
       */
      if (!sentooResponse?.success || !sentooResponse?.payment?.url) {
        paymentWindow?.close();

        throw new Error(
          sentooResponse?.error || "Kon de betaling niet aanmaken.",
        );
      }

      /**
       * Registrar pago local
       */
      const payment: PaymentCreate = {
        debtClaim_id: null,
        agreement_id: null,

        method: "TRANSFER",

        total_amount: price,

        paid_at: null,

        status: "pending",

        provider: "sentoo",

        provider_ref: sentooResponse.payment.id,

        payment_type: PaymentType.FINANCIAL_REPORT,

        /**
         * Evita guardar payloads gigantes
         */
        provider_payload: JSON.stringify({
          id: sentooResponse.payment.id,
          reference,
        }),

        reference_number: reference,
      };

      const paymentResult = await registerDebtPayment(tenantId, payment);

      if (!paymentResult) {
        paymentWindow?.close();

        throw new Error("Kon de betaling niet registreren.");
      }

      const debtor = await getDebtorByUserId(
        session?.user?.id || "",
        session?.user?.tenant_id || "",
      );

      if (!debtor) {
        throw new Error("Debiteur niet gevonden voor de huidige gebruiker.");
      }

      // Creamos la solicitud de reporte financiero vinculada al pago registrado
      await createFinancialReportRequest({
        tenant_id: tenantId,
        person_id: debtor.person_id || "",
        payment_id: paymentResult?.id || "",
        amount: price,
      });

      /**
       * Validar registro local
       */
      if (!paymentResult?.id) {
        paymentWindow?.close();

        throw new Error("Kon de betaling niet registreren.");
      }

      notifyInfo("Doorsturen naar de betaalpagina...");

      /**
       * Redirección segura
       */
      if (paymentWindow) {
        paymentWindow.location.href = sentooResponse.payment.url;
      } else {
        window.location.href = sentooResponse.payment.url;
      }
    } catch (error) {
      console.error("Payment process error:", error);

      const message =
        error instanceof Error
          ? error.message
          : "Er is een fout opgetreden tijdens het verwerken van de betaling.";

      setError(message);

      notifyError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "80vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        py: 5,
        px: 2,
        bgcolor: "#f8fafc",
      }}
    >
      <Container maxWidth="sm">
        <Card
          elevation={0}
          sx={{
            border: "1px solid #E2E8F0",
            borderRadius: 3,
            p: { xs: 2, md: 4 },
            boxShadow: "0 10px 30px rgba(15,23,42,0.04)",
          }}
        >
          <Stack spacing={3}>
            {/* HEADER */}
            <Stack direction="row" spacing={2} alignItems="center">
              <Box
                sx={{
                  width: 52,
                  height: 52,
                  borderRadius: 2,
                  bgcolor: "primary.main",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <InsertDriveFileOutlinedIcon
                  sx={{
                    color: "#fff",
                    fontSize: 26,
                  }}
                />
              </Box>

              <Box>
                <Typography variant="h6" fontWeight={700}>
                  Financiële Verklaring
                </Typography>

                <Typography variant="body2" color="text.secondary">
                  Digitaal PDF-document
                </Typography>
              </Box>
            </Stack>

            {/* RESUMEN */}
            <Box
              sx={{
                bgcolor: "#f9fafb",
                border: "1px solid #E2E8F0",
                borderRadius: 2,
                p: 2.5,
              }}
            >
              <Stack spacing={2}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Product
                  </Typography>

                  <Typography fontWeight={600}>Financieel Rapport</Typography>
                </Stack>

                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Hoeveelheid
                  </Typography>

                  <Typography fontWeight={600}>1</Typography>
                </Stack>

                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Prijs
                  </Typography>

                  <Typography fontWeight={600}>
                    {formatCurrency(price)}
                  </Typography>
                </Stack>

                <Divider />

                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Typography variant="subtitle1" fontWeight={700}>
                    Totaal
                  </Typography>

                  <Typography
                    variant="h6"
                    fontWeight={800}
                    color="primary.main"
                  >
                    {formatCurrency(price)}
                  </Typography>
                </Stack>
              </Stack>
            </Box>

            {/* ERROR */}
            {error && <Alert severity="error">{error}</Alert>}

            {/* BUTTON */}
            <Button
              fullWidth
              variant="contained"
              size="large"
              onClick={handlePayment}
              disabled={loading || price <= 0}
              sx={{
                py: 1.5,
                textTransform: "none",
                fontWeight: 700,
                fontSize: "1rem",
                boxShadow: "none",
              }}
            >
              {loading ? (
                <CircularProgress size={22} color="inherit" />
              ) : (
                "Betaal met Sentoo"
              )}
            </Button>

            <Typography
              variant="caption"
              color="text.secondary"
              textAlign="center"
            >
              Veilige betaling via Sentoo.
            </Typography>
          </Stack>
        </Card>

        <Alert
          severity="info"
          sx={{
            mt: 3,
            borderRadius: 2,
          }}
        >
          <Typography variant="body2">
            Nadat de betaling is bevestigd, wordt het financiële rapport
            automatisch gegenereerd en ontvang je een e-mail met het
            PDF-document.
          </Typography>
        </Alert>
      </Container>
    </Box>
  );
};

export default VerklaringPage;
