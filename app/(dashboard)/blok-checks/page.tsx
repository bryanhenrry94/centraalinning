"use client";

import { useState } from "react";
import {
  Container,
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  InputAdornment,
  Alert,
  CircularProgress,
  Dialog,
  DialogContent,
  Stack,
  Paper,
  IconButton,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";

import { formatCurrency } from "@/utils/formatters";
import { IdentificationType } from "@/constants/identification-type";
import { Close as CloseIcon } from "@mui/icons-material";
import { PaymentIntent } from "@/components/payment/PaymentIntent";
import { ResultView } from "./result-view";
import { BlokCheckResponse } from "@/services/block-check/block-check.types";
import { existsBlockCheck } from "@/actions/block-check";

const initialBlokCheck: BlokCheckResponse = {
  identification_type: IdentificationType.CEDULA,
  document_number: "0940528128",
  person_id: "",
  fullname: "John Doe",
  has_blockade: true,
};

const BlokCheckPage = () => {
  // local state
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [showCostDialog, setShowCostDialog] = useState(false);
  const [blokCheck, setBlokCheck] = useState<BlokCheckResponse | null>(
    initialBlokCheck,
  );
  const amountService = 30;

  const handleSearch = async () => {
    try {
      setLoading(true);
      setError("");

      // 1. Validar que el campo de búsqueda no esté vacío
      if (!search.trim()) {
        setError("Ingrese un valor para buscar");
        return;
      }

      // 2. Si ya existe un link de pago para este documento, abrirlo en una nueva pestaña
      if (paymentUrl) {
        window.open(paymentUrl, "_blank");
        return;
      }

      // 3. Mostrar el diálogo de confirmación de costos
      setShowCostDialog(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const createService = async () => {
    try {
      setLoading(true);
      setError("");

      const result = await existsBlockCheck(search);

      if (!result.success || !result.data) {
        setError("Niet gevonden");
        setLoading(false);
        return;
      }

      setBlokCheck(result.data);
      setShowResult(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSearch("");
    setError("");
    setBlokCheck(initialBlokCheck);
    setPaymentUrl(null);
    setShowResult(false);
  };

  return (
    <Container maxWidth="md">
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 4,
          mt: 8,
        }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Blok-Check uitvoeren
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Controleer of een persoon of onderneming geregistreerd staat met een
            economische blokkade.
          </Typography>
        </Box>
      </Box>

      {/* SEARCH CARD */}
      {!showResult ? (
        <Card>
          <CardContent>
            <Box display="flex" gap={2}>
              <TextField
                fullWidth
                placeholder="ID-nummer / KVK-nummer"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setError("");
                }}
                size="small"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />

              <Button
                variant="contained"
                onClick={handleSearch}
                disabled={search.trim().length <= 5 || loading}
                sx={{
                  px: 4,
                  textTransform: "none",
                  fontWeight: 600,
                }}
                size="small"
              >
                {loading ? <CircularProgress size={20} /> : "Zoeken"}
              </Button>
            </Box>

            {/* ERROR */}
            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
          </CardContent>
        </Card>
      ) : (
        <ResultView result={blokCheck} onClose={handleReset} />
      )}

      {/* Dialog ter bevestiging van kosten */}
      <Dialog
        open={showCostDialog}
        onClose={() => setShowCostDialog(false)}
        maxWidth="xs"
        fullWidth
      >
        <Box
          sx={{
            bgcolor: "secondary.main",
            color: "white",
            px: 2,
            py: 1.5,
            borderTopLeftRadius: 8,
            borderTopRightRadius: 8,
            borderBottom: "1px solid #e0e0e0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              width: "100%",
            }}
          >
            <Box flexGrow={1} textAlign="center">
              <Typography variant="h5" fontWeight={700} color="white">
                Betaling bevestigen
              </Typography>
            </Box>

            <IconButton
              onClick={() => setShowCostDialog(false)}
              sx={{ color: "white" }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>

        <DialogContent sx={{ p: 4 }}>
          <Stack spacing={4}>
            {/* Servicio */}
            <Paper
              variant="outlined"
              sx={{
                width: "100%",
                p: 2,
                borderRadius: 2,
                textAlign: "center",
                bgcolor: "background.default",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Typography variant="h4" fontWeight={700} color="primary.main">
                  {formatCurrency(amountService)}
                </Typography>
                &nbsp;&nbsp;&nbsp;&nbsp;
                <Typography variant="body2" color="text.secondary">
                  Per blok
                </Typography>
              </Box>
            </Paper>

            {/* Acties */}
            <Stack direction="row" spacing={2} width="100%">
              <Button
                fullWidth
                variant="outlined"
                color="inherit"
                startIcon={<CloseIcon />}
                onClick={() => setShowCostDialog(false)}
                sx={{ textTransform: "none" }}
              >
                Annuleren
              </Button>

              <PaymentIntent
                onCreateTransaction={async () => {
                  const res = await fetch("/api/payments/create", {
                    method: "POST",
                    body: JSON.stringify({
                      amount: amountService,
                      currency: "USD",
                      description: "Payment for Blok-Check service",
                    }),
                    headers: {
                      "Content-Type": "application/json",
                    },
                  });

                  const data = await res.json();

                  setPaymentUrl(data.paymentUrl);

                  return {
                    paymentId: data.paymentId,
                    paymentUrl: data.paymentUrl,
                  };
                }}
                onPaymentConfirmed={async () => {
                  setShowCostDialog(false);
                  await createService();
                }}
              />
            </Stack>

            {/* Seguridad */}
            {/* <Stack
              direction="row"
              spacing={1}
              justifyContent="center"
              alignItems="center"
            >
              <LockIcon fontSize="small" color="action" />
              <Typography variant="caption" color="text.secondary">
                Veilig betalen via CFSB beveiligde omgeving
              </Typography>
            </Stack> */}
          </Stack>
        </DialogContent>
      </Dialog>
    </Container>
  );
};

export default BlokCheckPage;
