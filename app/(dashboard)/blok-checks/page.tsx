"use client";

import { useEffect, useState } from "react";
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
import { Close as CloseIcon } from "@mui/icons-material";
import { useSession } from "next-auth/react";

import { formatCurrency } from "@/utils/formatters";
import { PaymentIntent } from "@/components/payment/PaymentIntent";
import { ResultView } from "./result-view";
import { BlokCheckResponse } from "@/services/block-check/block-check.types";
import { existsBlockCheck } from "@/actions/block-check";
import { getParameterAction } from "@/actions/parameter";
import { canUseFeature } from "@/utils/permission";
import { AppAction } from "@/constants/AppAction";

const BlokCheckPage = () => {
  const { data: session } = useSession();

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [showCostDialog, setShowCostDialog] = useState(false);
  const [blokCheck, setBlokCheck] = useState<BlokCheckResponse | null>(null);
  const [amountService, setAmountService] = useState<number>(30);

  useEffect(() => {
    getParameterAction().then((param) => {
      if (param?.blok_check_pricing) {
        setAmountService(param.blok_check_pricing);
      }
    });
  }, []);

  // Membership gate
  const currentMembership =
    session?.user?.memberships?.find(
      (m) => m.tenantId === session?.user?.tenant_id,
    ) ?? null;

  const permission = canUseFeature(currentMembership, AppAction.BLOK_CHECK);

  const handleSearch = async () => {
    try {
      setLoading(true);
      setError("");

      if (!search.trim()) {
        setError("Ingrese un valor para buscar");
        return;
      }

      if (paymentUrl) {
        window.open(paymentUrl, "_blank");
        return;
      }

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
        setError(
          "Geen persoon gevonden met dit identificatienummer in het systeem",
        );
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
    setBlokCheck(null);
    setPaymentUrl(null);
    setShowResult(false);
  };

  if (!permission.allowed) {
    return (
      <Container maxWidth="md" sx={{ mt: 8 }}>
        <Alert severity="warning">
          <Typography fontWeight={600}>Geen toegang</Typography>
          <Typography variant="body2">{permission.reason}</Typography>
        </Alert>
      </Container>
    );
  }

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
        <>
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
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon />
                        </InputAdornment>
                      ),
                    },
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

              {error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {error}
                </Alert>
              )}
            </CardContent>
          </Card>
          <Box
            sx={{
              mt: 2,
              p: 2,
              bgcolor: "rgba(30, 95, 177, 0.05)",
              border: "1px solid rgba(30, 95, 177, 0.1)",
              borderRadius: 1,
              display: "flex",
              gap: 1.5,
            }}
          >
            <Box
              sx={{
                minWidth: 24,
                height: 24,
                borderRadius: "50%",
                bgcolor: "rgba(30, 95, 177, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#1e5fb1",
                fontSize: 16,
                flexShrink: 0,
                mt: 0.25,
              }}
            >
              ℹ
            </Box>
            <Box>
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 600, mb: 0.5, color: "#1e5fb1" }}
              >
                Wat kunt u doen?
              </Typography>
              <Typography
                sx={{
                  color: "#5a6f8f",
                  lineHeight: 1.5,
                  fontSize: "0.875rem",
                  textAlign: "justify",
                }}
              >
                Voer een ID- of KVK-nummer in om te controleren of een persoon
                of onderneming voorkomt op de lijst met economisch geblokkeerde
                partijen.
              </Typography>
            </Box>
          </Box>
        </>
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
                      description: "Blok-Check service",
                      payment_type: "BLOK_CHECK",
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
          </Stack>
        </DialogContent>
      </Dialog>
    </Container>
  );
};

export default BlokCheckPage;
