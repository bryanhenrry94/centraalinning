"use client";

import React, { useEffect, useState } from "react";
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
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import {
  createBlokCheckRequest,
  existBlokCheckRequestForDocument,
  getBlokCheckRequest,
  listBlokCheckRequests,
  updateBlokCheckRequest,
} from "@/actions/blok-check-request";
import { useSession } from "next-auth/react";
import { notifyError, notifyInfo } from "@/lib/notifications";
import {
  BlokCheckRequest,
  BlokCheckRequestResponse,
} from "@/lib/validations/blok-check-request";
import RefreshIcon from "@mui/icons-material/Refresh";
import { formatDate, formatDateTime } from "@/utils/formatters";
import { PaymentCreate } from "@/lib/validations/payment";
import { createSentooPayment } from "@/actions/sentoo.actions";
import { registerPayment } from "@/actions/payment";
import { IdentificationType } from "@/constants/identification-type";

const BlokCheckPage = () => {
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { data: session } = useSession();
  const [blokCheckRequests, setBlokCheckRequests] = useState<
    BlokCheckRequestResponse[]
  >([]);
  const serviceAmount = 30;

  const [pagoRealizado, setPagoRealizado] = useState(false);

  const handlePagoRealizado = () => {
    setPagoRealizado(true);
  };

  const handleSearch = async () => {
    const tenantId = session?.user?.tenant_id;

    if (!tenantId) {
      setError("No tenant ID found in session");
      return;
    }

    if (!search.trim()) {
      setError("Ingrese un valor para buscar");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const newBlokCheckRequest = {
        document_type: IdentificationType.CEDULA,
        document_number: search,
        amount: serviceAmount, // Costo fijo por bloque-check
      };

      const existingPerson = await existBlokCheckRequestForDocument(
        newBlokCheckRequest.document_number,
      );

      if (!existingPerson) {
        setError(
          "Het documentnummer is niet geregistreerd in het systeem. Controleer het en probeer het opnieuw.",
        );
        setLoading(false);
        return;
      }

      // 1. Crear solicitud de blok-check
      await createBlokCheckRequest(tenantId, newBlokCheckRequest);
      // 2. Recargar lista de solicitudes
      await loadBlokCheckRequests();

      notifyInfo(
        "Blok-Check aanvraag is ingediend. Resultaat volgt binnen enkele minuten.",
      );
      setSearch("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    await loadBlokCheckRequests();
  };

  const loadBlokCheckRequests = async () => {
    const tenantId = session?.user?.tenant_id;
    if (!tenantId) {
      setError("No tenant ID found in session");
      return;
    }

    try {
      const requests = await listBlokCheckRequests(tenantId);
      console.log("Loading Blok-Check Requests:", requests);
      setBlokCheckRequests(requests);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  useEffect(() => {
    loadBlokCheckRequests();
  }, [session]);

  const handlePayment = async (requestId: string) => {
    const tenantId = session?.user?.tenant_id;
    if (!tenantId) {
      setError("No tenant ID found in session");
      return;
    }

    const blokCheckRequest = await getBlokCheckRequest(requestId);
    if (!blokCheckRequest) {
      setError("Blok-Check aanvraag niet gevonden");
      return;
    }

    // 2. Crear pago en Sentoo
    const res = await createSentooPayment({
      amount: blokCheckRequest.amount,
      description: `Blok-Check voor document ${blokCheckRequest.document_number}`,
      reference: `blok-check-${blokCheckRequest.document_number}-${Date.now()}`,
    });

    if (!res.success || !res.payment?.url) {
      throw new Error("Error al crear el pago en Sentoo");
    }

    const payment: PaymentCreate = {
      debt_id: null,
      method: "TRANSFER",
      total_amount: blokCheckRequest.amount,
      paid_at: null,
      status: "pending",
      provider: "sentoo",
      provider_ref: res.payment.id,
      provider_payload: JSON.stringify(res.raw),
      reference_number: "",
      agreement_id: null,
      payment_type: "BLOK_CHECK",
    };

    const paymentRes = await registerPayment(tenantId, payment);

    const blokCheckRequestUpdateData: Partial<BlokCheckRequest> = {
      payment_id: paymentRes.id,
      payment_status: "pending",
    };

    await updateBlokCheckRequest(
      blokCheckRequest.id,
      blokCheckRequestUpdateData,
    );

    const newTab = window.open("", "_blank");

    if (!paymentRes.id) {
      notifyError("Error al registrar el pago");
      newTab?.close();
      return;
    }

    notifyInfo("Redirigiendo a la pasarela de pago...");

    if (newTab) {
      newTab.location.href = res.payment.url;
    } else {
      window.location.href = res.payment.url;
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      {/* SEARCH CARD */}
      <Card
        sx={{
          borderRadius: 4,
          boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
        }}
      >
        <CardContent>
          <Typography variant="h4" fontWeight={600} mb={1}>
            Debiteur zoeken
          </Typography>

          <Typography color="text.secondary" mb={10}>
            De Blok-Check is een controlemiddel waarmee u kunt nagaan of een
            debiteur een actieve economische blokkade of registraties heeft
            binnen de CFSB-samenwerking.{" "}
            <strong>Kosten: ${serviceAmount} per controle</strong>
          </Typography>

          <Box display="flex" gap={2}>
            <TextField
              fullWidth
              placeholder="Voer cedula-, KVK-, paspoort- of rijbewijsnummer in"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setError("");
              }}
              size="medium"
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
              disabled={loading}
              sx={{
                px: 4,
                textTransform: "none",
                fontWeight: 600,
              }}
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

      {blokCheckRequests.map((request) => (
        <Box key={request.id} sx={{ mt: 2 }}>
          {/* Status Banner */}
          <Box
            sx={{
              backgroundColor:
                request.payment_status === "pending"
                  ? "#ff9800"
                  : request.has_blockade
                    ? "#E80909"
                    : "#2e7d32",
              color: "white",
              p: 2,
              display: "flex",
              alignItems: "center",
              gap: 2,
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 40,
                height: 40,
                borderRadius: "50%",
                backgroundColor: "rgba(255, 255, 255, 0.3)",
              }}
            >
              <Typography variant="body1">
                {request.payment_status === "pending" ? "!" : "✓"}
              </Typography>
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={700}>
                {request.payment_status === "pending"
                  ? "BETALING OPENSTAANDE"
                  : request.has_blockade
                    ? "MET BLOKKADES"
                    : "Geen Blokkade"}
              </Typography>
            </Box>
          </Box>

          {/* Content Card */}
          {loading ? (
            <Typography variant="body1" sx={{ p: 2 }}>
              Details laden...
            </Typography>
          ) : (
            <Card
              sx={{
                borderRadius: "0 0 8px 8px",
                boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
              }}
            >
              <CardContent sx={{ p: 2 }}>
                {/* Debtor Information Section */}
                <Box sx={{ mb: 2 }}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      mb: 1.5,
                    }}
                  >
                    <Typography
                      variant="body1"
                      fontWeight={600}
                      sx={{ fontSize: "1.05rem" }}
                    >
                      Informatie
                    </Typography>
                  </Box>

                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 2,
                    }}
                  >
                    <Box
                      sx={{
                        backgroundColor: `${request.has_blockade ? "#F5E8E8" : "#E8F5E9"}`,
                        p: 1.5,
                        borderRadius: 1,
                        border: `1px solid ${request.has_blockade ? "#F89191" : "#81C784"}`,
                      }}
                    >
                      <Typography
                        variant="caption"
                        color="textSecondary"
                        sx={{ mb: 0.25, fontWeight: 500, fontSize: "0.8rem" }}
                      >
                        ID
                      </Typography>
                      <Typography
                        variant="body2"
                        // fontWeight={600}
                        sx={{ fontSize: "1.5rem" }}
                      >
                        {request.identification_type}
                      </Typography>
                    </Box>

                    <Box
                      sx={{
                        backgroundColor: `${request.has_blockade ? "#F5E8E8" : "#E8F5E9"}`,
                        p: 1.5,
                        borderRadius: 1,
                        border: `1px solid ${request.has_blockade ? "#F89191" : "#81C784"}`,
                      }}
                    >
                      <Typography
                        variant="caption"
                        color="textSecondary"
                        sx={{ mb: 0.25, fontWeight: 500, fontSize: "0.8rem" }}
                      >
                        Nummer
                      </Typography>
                      <Typography
                        variant="body2"
                        // fontWeight={600}
                        sx={{ fontSize: "1.5rem" }}
                      >
                        {request.document_number}
                      </Typography>
                    </Box>

                    <Box
                      sx={{
                        gridColumn: "1 / -1",
                        backgroundColor: `${request.has_blockade ? "#F5E8E8" : "#E8F5E9"}`,
                        p: 1.5,
                        borderRadius: 1,
                        border: `1px solid ${request.has_blockade ? "#F89191" : "#81C784"}`,
                      }}
                    >
                      <Typography
                        variant="caption"
                        color="textSecondary"
                        sx={{ mb: 0.25, fontWeight: 500, fontSize: "0.8rem" }}
                      >
                        Naam
                      </Typography>
                      <Typography
                        variant="body2"
                        // fontWeight={600}
                        sx={{ fontSize: "1.5rem" }}
                      >
                        {request.fullname}
                      </Typography>
                    </Box>

                    <Box
                      sx={{
                        backgroundColor: `${request.has_blockade ? "#F5E8E8" : "#E8F5E9"}`,
                        p: 1.5,
                        borderRadius: 1,
                        border: `1px solid ${request.has_blockade ? "#F89191" : "#81C784"}`,
                      }}
                    >
                      <Typography
                        variant="caption"
                        color="textSecondary"
                        sx={{ mb: 0.25, fontWeight: 500, fontSize: "0.8rem" }}
                      >
                        Datum
                      </Typography>
                      <Typography
                        variant="body2"
                        // fontWeight={600}
                        sx={{ fontSize: "1.5rem" }}
                      >
                        {formatDate(request.created_at.toString())}
                      </Typography>
                    </Box>

                    {request.has_blockade ? (
                      <Alert
                        variant="filled"
                        severity="warning"
                        sx={{
                          gridColumn: "1 / -1",
                          fontSize: "1.2rem",
                          borderRadius: 0,
                        }}
                      >
                        Verzoek aan schuldenaar om een aanvraag in te dienen
                        voor financieel rapport bij de CFSB om een gedetailleerd
                        rapport van blokkades en beperkingen te verkrijgen.
                      </Alert>
                    ) : (
                      <Alert
                        variant="filled"
                        severity="success"
                        sx={{
                          gridColumn: "1 / -1",
                          fontSize: "1.2rem",
                          borderRadius: 0,
                        }}
                      >
                        Geen actieve blokkades in het systeem aangetroffen.
                      </Alert>
                    )}
                  </Box>
                </Box>

                {request.payment_status !== "paid" && (
                  <Box
                    sx={{
                      mt: 1.5,
                      display: "flex",
                      justifyContent: "flex-end",
                    }}
                  >
                    <Button
                      variant="contained"
                      color="primary"
                      sx={{
                        textTransform: "none",
                        px: 2,
                        py: 0.75,
                        fontSize: "0.9rem",
                      }}
                      onClick={() => handlePayment(request.id)}
                    >
                      Betaal ${serviceAmount}.00
                    </Button>
                    <Button
                      variant="outlined"
                      color="secondary"
                      sx={{
                        textTransform: "none",
                        px: 2,
                        py: 0.75,
                        fontSize: "0.9rem",
                      }}
                      onClick={handleRefresh}
                      startIcon={<RefreshIcon />}
                    >
                      Ik heb al betaald
                    </Button>
                  </Box>
                )}
              </CardContent>
            </Card>
          )}
        </Box>
      ))}
    </Container>
  );
};

export default BlokCheckPage;
