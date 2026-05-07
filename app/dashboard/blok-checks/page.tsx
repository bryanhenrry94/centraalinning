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
import { formatDateTime } from "@/utils/formatters";
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
      {/* HEADER & INFO CARD */}
      <Card
        sx={{
          mb: 4,
          borderRadius: 4,
          backgroundColor: "#f5f7fb",
          boxShadow: "none",
        }}
      >
        <CardContent sx={{ display: "flex", gap: 2 }}>
          <Box>
            <Typography variant="h4" fontWeight={700} mb={1}>
              Blok-Check
            </Typography>
            <Typography color="text.secondary" mb={2}>
              Controleer of een debiteur een actieve blokkade heeft.
            </Typography>

            <Typography color="text.secondary">
              De Blok-Check is een controlemiddel waarmee u kunt nagaan of een
              debiteur een actieve economische blokkade of registraties heeft
              binnen de CFSB-samenwerking.{" "}
              <strong>Kosten: ${serviceAmount} per controle</strong>
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* SEARCH CARD */}
      <Card
        sx={{
          borderRadius: 4,
          boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
        }}
      >
        <CardContent>
          <Typography variant="h6" fontWeight={600} mb={3}>
            Debiteur zoeken
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
                borderRadius: 3,
                textTransform: "none",
                fontWeight: 600,
              }}
            >
              {loading ? <CircularProgress size={20} /> : "Controleren"}
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
                    ? "#d32f2f"
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
              <Typography variant="body1" fontWeight={700}>
                {request.payment_status === "pending"
                  ? "PAGO PENDIENTE"
                  : request.has_blockade
                    ? "CON BLOQUEOS"
                    : "SIN BLOQUEOS"}
              </Typography>
              <Typography variant="caption" sx={{ fontSize: "0.85rem" }}>
                {request.payment_status === "pending"
                  ? "Realice el pago para ver el resultado de la consulta"
                  : request.has_blockade
                    ? "Se encontraron restricciones activas"
                    : "No se encontraron restricciones activas"}
              </Typography>
            </Box>
          </Box>

          {/* Content Card */}
          {loading ? (
            <Typography variant="body1" sx={{ p: 2 }}>
              Cargando detalles...
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
                      Informacion del Deudor
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
                        backgroundColor: "#E8E6E6",
                        p: 1.5,
                        borderRadius: 1,
                      }}
                    >
                      <Typography
                        variant="caption"
                        color="textSecondary"
                        sx={{ mb: 0.25, fontWeight: 500, fontSize: "0.8rem" }}
                      >
                        Tipo
                      </Typography>
                      <Typography
                        variant="body2"
                        fontWeight={600}
                        sx={{ fontSize: "0.95rem" }}
                      >
                        {request.identification_type}
                      </Typography>
                    </Box>

                    <Box
                      sx={{
                        backgroundColor: "#E8E6E6",
                        p: 1.5,
                        borderRadius: 1,
                      }}
                    >
                      <Typography
                        variant="caption"
                        color="textSecondary"
                        sx={{ mb: 0.25, fontWeight: 500, fontSize: "0.8rem" }}
                      >
                        Numero
                      </Typography>
                      <Typography
                        variant="body2"
                        fontWeight={600}
                        sx={{ fontSize: "0.95rem" }}
                      >
                        {request.document_number}
                      </Typography>
                    </Box>

                    <Box
                      sx={{
                        gridColumn: "1 / -1",
                        backgroundColor: "#E8E6E6",
                        p: 1.5,
                        borderRadius: 1,
                      }}
                    >
                      <Typography
                        variant="caption"
                        color="textSecondary"
                        sx={{ mb: 0.25, fontWeight: 500, fontSize: "0.8rem" }}
                      >
                        Nombre Completo
                      </Typography>
                      <Typography
                        variant="body2"
                        fontWeight={600}
                        sx={{ fontSize: "0.95rem" }}
                      >
                        {request.fullname}
                      </Typography>
                    </Box>

                    <Box
                      sx={{
                        backgroundColor: "#E8E6E6",
                        p: 1.5,
                        borderRadius: 1,
                      }}
                    >
                      <Typography
                        variant="caption"
                        color="textSecondary"
                        sx={{ mb: 0.25, fontWeight: 500, fontSize: "0.8rem" }}
                      >
                        Fecha de Consulta
                      </Typography>
                      <Typography
                        variant="body2"
                        fontWeight={600}
                        sx={{ fontSize: "0.95rem" }}
                      >
                        {formatDateTime(request.created_at.toString())}
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                {/* Payment Status */}
                {request.payment_status === "paid" && (
                  <Box
                    sx={{
                      backgroundColor: "#e8f5e9",
                      border: "1px solid #4caf50",
                      borderRadius: 1,
                      p: 1.5,
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                    }}
                  >
                    <Typography sx={{ color: "#2e7d32" }}>✓</Typography>
                    <Box>
                      <Typography
                        variant="caption"
                        sx={{
                          color: "#2e7d32",
                          fontWeight: 500,
                          fontSize: "0.9rem",
                        }}
                      >
                        Pago confirmado
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{ color: "#1b5e20", fontSize: "0.75rem" }}
                      >
                        Sentoo
                      </Typography>
                    </Box>
                    <Typography
                      variant="body2"
                      sx={{
                        ml: "auto",
                        color: "#2e7d32",
                        fontWeight: 700,
                        fontSize: "0.95rem",
                      }}
                    >
                      ${serviceAmount}.00
                    </Typography>
                  </Box>
                )}

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
                      Pagar ${serviceAmount}.00
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
                      Ya hice el pago
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
