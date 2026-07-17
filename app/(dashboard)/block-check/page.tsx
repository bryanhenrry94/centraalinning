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

import { formatCurrency } from "@/shared/utils/formatters";
import { PaymentIntent } from "@/modules/payment/components/PaymentIntent";
import { ResultView } from "../../../modules/block-check/components/block-check-result";
import { BlokCheckResponse } from "@/modules/block-check/services/block-check.types";
import { existsBlockCheck } from "@/modules/block-check/actions/block-check.actions";
import { getParameterAction } from "@/modules/settings/actions/parameter.actions";
import { canUseFeature } from "@/shared/utils/permission";
import { AppAction } from "@/shared/constants/AppAction";
import { PaymentType } from "@/modules/payment/services/payment.validators";
import { notifyError } from "@/shared/ui/notifications";

const BlokCheckPage = () => {
  const { data: session } = useSession();

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [showCostDialog, setShowCostDialog] = useState(false);
  const [blokCheck, setBlokCheck] = useState<BlokCheckResponse | null>(null);
  const [amountService, setAmountService] = useState<number>(0);

  useEffect(() => {
    if (!session?.user?.tenant_id) return;

    const fetchParameter = async () => {
      try {
        const parameter = await getParameterAction();
        console.log("Fetched parameter:", parameter);
        setAmountService(parameter?.blok_check_pricing ?? 30);
      } catch (err) {
        console.error("Error fetching parameter:", err);
      }
    };

    fetchParameter();
  }, [session?.user?.tenant_id]);

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

  const handleCreateTransaction = async (): Promise<{
    success: boolean;
    error?: string;
    paymentId?: string;
    paymentUrl?: string;
  }> => {
    // const isValid = await trigger();
    // if (!isValid) {
    //   return { success: false, error: "Formulario inválido" };
    // }

    if (amountService <= 0) {
      notifyError("Het servicebedrag moet groter zijn dan 0");
      return { success: false, error: "Servicebedrag is 0" };
    }

    const res = await fetch("/api/payments/create", {
      method: "POST",
      body: JSON.stringify({
        amount: amountService,
        currency: "USD",
        description: "Registratie incassovordering",
        payment_type: PaymentType.COLLECTION,
      }),
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok) {
      notifyError("Fout bij het aanmaken van de betaling");
      throw new Error("Payment creation failed");
    }

    const data = await res.json();
    return {
      success: true,
      paymentId: data.paymentId,
      paymentUrl: data.paymentUrl,
    };
  };

  return (
    <Container
      maxWidth="md"
      disableGutters
      sx={{
        py: { xs: 1.5, sm: 4 },
        px: { xs: 1, sm: 3 },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: { xs: 2, sm: 4 },
        }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Blok-Check uitvoeren
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Controleer of een persoon of onderneming is geregistreerd met een
            economische blokkade.
          </Typography>
        </Box>
      </Box>

      {/* SEARCH CARD */}
      {!showResult ? (
        <>
          <Card>
            <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
              <Box
                sx={{
                  display: "flex",
                  flexDirection: { xs: "column", sm: "row" },
                  gap: { xs: 1, sm: 2 },
                }}
              >
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
                    width: { xs: "100%", sm: "auto" },
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
          <Alert severity="info" sx={{ mt: 3 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
              Wat kunt u doen?
            </Typography>
            <Typography variant="body2" sx={{ textAlign: "justify" }}>
              Voer een ID- of KVK-nummer in om te controleren of een persoon of
              onderneming voorkomt op de lijst met economisch geblokkeerde
              partijen.
            </Typography>
          </Alert>
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

        <DialogContent sx={{ p: { xs: 2, sm: 4 } }}>
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
                onCreateTransaction={handleCreateTransaction}
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
