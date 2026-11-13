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
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { useSession } from "next-auth/react";

import { PaymentIntent } from "@/modules/payment/components/PaymentIntent";
import { PaymentConfirmDialog } from "@/shared/ui/payment-confirm-dialog";
import { ResultView } from "../../../modules/block-check/components/block-check-result";
import { BlokCheckResponse } from "@/modules/block-check/services/block-check.types";
import { existsBlockCheck } from "@/modules/block-check/actions/block-check.actions";
import { getParameterForTenantAction } from "@/modules/settings/actions/parameter.actions";
import { canUseFeature } from "@/shared/utils/permission";
import { AppAction } from "@/shared/constants/AppAction";
import { PaymentType } from "@/modules/payment/services/payment.validators";
import { notifyError } from "@/shared/ui/notifications";
import { calculateAbb } from "@/shared/utils/abb";

const BlokCheckPage = () => {
  const { data: session } = useSession();

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [showCostDialog, setShowCostDialog] = useState(false);
  const [blokCheck, setBlokCheck] = useState<BlokCheckResponse | null>(null);
  const [amountService, setAmountService] = useState<number>(0);
  const [abbRate, setAbbRate] = useState<number>(0);

  const { total: totalAmount } = calculateAbb(amountService, abbRate);

  useEffect(() => {
    if (!session?.user?.tenant_id) return;

    const fetchParameter = async () => {
      try {
        const parameter = await getParameterForTenantAction();
        setAmountService(parameter?.blok_check_pricing ?? 35);
        setAbbRate(parameter?.abb_rate ?? 0);
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
        setError("Voer een waarde in om te zoeken");
        return;
      }

      setShowCostDialog(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Er is een fout opgetreden",
      );
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
          result.error ??
            `Geen resultaat gevonden. 
            Er is geen registratie gevonden die overeenkomt met de ingevoerde gegevens.`,
        );
        setLoading(false);
        return;
      }

      setBlokCheck(result.data);
      setShowResult(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Er is een fout opgetreden",
      );
    } finally {
      setLoading(false);
    }
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

    if (totalAmount <= 0) {
      notifyError("Het servicebedrag moet groter zijn dan 0");
      return { success: false, error: "Servicebedrag is 0" };
    }

    const res = await fetch("/api/payments/create", {
      method: "POST",
      body: JSON.stringify({
        amount: totalAmount,
        currency: "USD",
        description: "Blok-Check (BLC)",
        payment_type: PaymentType.COLLECTION,
      }),
      headers: { "Content-Type": "application/json" },
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      const message = data.error || "Fout bij het aanmaken van de betaling";
      notifyError(message);
      return { success: false, error: message };
    }

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
        py: { xs: 1, sm: 2 },
        px: { xs: 1, sm: 3 },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: { xs: 1.5, sm: 2 },
        }}
      >
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Blok-Check uitvoeren
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Controleer of een persoon of onderneming een economische blokkade
            heeft.
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
                  placeholder="ID-nummer / KVK-nummer / CFSB-nummer / Volledige naam"
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
        </>
      ) : (
        <ResultView result={blokCheck} />
      )}

      <PaymentConfirmDialog
        open={showCostDialog}
        onClose={() => setShowCostDialog(false)}
        lineItems={[]}
        total={totalAmount}
        totalLabel="CFSB-kosten"
        payAction={
          <PaymentIntent
            onCreateTransaction={handleCreateTransaction}
            onPaymentConfirmed={async () => {
              setShowCostDialog(false);
              await createService();
            }}
          />
        }
      />
    </Container>
  );
};

export default BlokCheckPage;
